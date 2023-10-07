global.asyncHandler = require('express-async-handler');
// native
const path = require('path');
const fs = require('fs');
// external
const { Log } = require('../log');
const { StaticUtil } = require('../util');

const express = require('express');
const error = require('./RouteError');
const _ = require('lodash');
const rrService = require('./routeRoles/service');
const laService = require('./localAccts/service');

// require('express-async-errors');

const router = express.Router();

/* GET home page. */
router.get('/', function (req, res, next) {
    res.render('index', { title: 'Zoinx' });
});

// can be used as single entries but not encouraged.
const routes = {
    pingpong: {
        base: '/ping',
        router: require('./ping')
    }
};

const defs = [];

async function addZoinxRoutes(app, routeGroups=[]) {
    const directories = ['./validatedAuths', './routeRoles', './localAccts', './telemetrySendFails', './testingResultsRealtime'];

    try {
        for (let i = 0; i < directories.length; i++) {
            //console.log(directories[i]);
            const router = require(`${directories[i]}/index.js`);
            routeGroups.push(new router(app));
        }
    }
    catch (e) {
        Log.error(e.message);
    }
}

async function addRoutes(app, routes = {}, srcPath) {

    if (_.isEmpty(srcPath) || !_.isString(srcPath)) throw new Error('Must supply a source path for the project for routes to work.');

    const directories = ['/entities', '/features'],
        routeGroups = [];
    let directoryPath = '',
        files,
        routeFile;

    try {
        if (directories.length > 0) {
            for (let i = 0; i < directories.length; i++) {
                directoryPath = path.join(srcPath, directories[i]);
                //console.log(`=================READ directory: ${directoryPath}`);
                files = await StaticUtil.readdirAsync(directoryPath);

                if (files && files.length > 0) {
                    for (let j = 0; j < files.length; j++) {
                        if (fs.statSync(path.join(directoryPath, files[j])).isDirectory()) {
                            routeFile = path.join(directoryPath, `${files[j]}/index.js`);
                            //console.log(`++++++++++++++++ Found file: ${routeFile}`);
                            if (fs.existsSync(routeFile)) {
                                const router = require(routeFile);
                                routeGroups.push(new router(app));
                            } else {
                                Log.info('%s (%s)', files[j], 'index.js does not exist for routes.');
                            }
                        }
                    }
                }
            }

            await addZoinxRoutes(app, routeGroups);
            let routeHandleList = [];
            routeGroups.forEach((route, idx) => {
                let routeHandle = Object.keys(route.getRoutes())[0] ?? 'disabled';

                if (_.isEmpty(routeHandle) || routeHandle === 'disabled') {
                    Log.warn('=====================================');
                    Log.warn(`Route ${route.constructor.name} is disabled`);
                    Log.warn('=====================================');
                }
                else {
                    if (routeHandleList.includes(routeHandle)) {
                        Log.warn(`Route conflict for ${route.constructor.name}, duplicate Route object named ${routeHandle}. Not overwriting/mounting this route`);
                    } else {
                        routeHandleList.push(Object.keys(route.getRoutes())[0]);
                        Object.assign(routes, route.getRoutes());
                    }
                }
                console.log(`[${idx}] ${route.constructor.name} -- ${routeHandle}\n`);
            });

            Object.keys(routes).forEach(function (name) {
                const route = this[name];
                try {
                    defs.push({ name, uri: route.base });
                    app.use(route.base, route.router);
                    Log.debug('Initialized: ' + route.base);
                    // console.log('Initialized: ' + route.base);
                } catch (err) {
                    // console.log('Failed to mount router', route.base);
                    Log.error(err.stack);
                }
            }, routes);

            await addMissingRouteRoles(routes);
            await processProjectInit();

            // Add Middleware functions here.
            app.use(error);

            app.use('/help', (req, res) => res.status(200).send({ routes: defs }));
        }
    } catch (ex) {
        console.log(ex);
    }
    return routes;
}

async function addMissingRouteRoles(routes) {

    try {
        if (!_.isEmpty(routes) && _.isObject(routes)) {
            let routeRolesService = new rrService(),
                checkArray = [],
                checkArrayExisting = [],
                polledRouteRoles = [],
                existingRouteRoles, routeKeys, roleHandles;

            existingRouteRoles = await routeRolesService.find({filters: []});

            routeKeys = Object.keys(routes);
            for (let i=0; i<routeKeys.length; i++) {
                roleHandles = routes[routeKeys[i]].router.roleHandles;
                if (!_.isEmpty(roleHandles)) {
                    for (let j=0; j<roleHandles.length; j++) {
                        checkArray.push(`${roleHandles[j].route_method}=>${roleHandles[j].route_path}`);
                        polledRouteRoles.push(roleHandles[j]);
                    }
                }
            }

            for (i=0; i<existingRouteRoles.length; i++) {
                checkArrayExisting.push(
                    `${existingRouteRoles[i].get('route_method')}=>${existingRouteRoles[i].get('route_path')}`
                );
            }

            const missingRouteRoles = polledRouteRoles.filter(item1 => !existingRouteRoles.some(item2 => (item1.route_method === item2.get('route_method') && item1.route_path === item2.get('route_path')) ));

            if (missingRouteRoles.length > 0) {
                await routeRolesService.batchInsert(missingRouteRoles);
                Log.info(`Added ${missingRouteRoles.length} routes to routeRoles`);
            }

            if (checkArray.length !== checkArrayExisting.length) {
                function findMissingRoutes(arr1, arr2) {
                    return arr1.filter(
                        (element) => !arr2.includes(element)
                    );
                }
                let missingRoutes = findMissingRoutes(checkArrayExisting, checkArray);
                for (i=0; i<missingRoutes.length; i++) {
                    Log.info(`${missingRoutes[i]} has permissions assigned but no matching routes in application. Might need to delete existing permissions from DB.`);
                }

            }
        }
    }
    catch (e) {
        Log.warn(e.message);
    }

}

async function processProjectInit() {
    Log.warn(`About to process project init stuff. ${process.env.PWD}`);
    try {
        let projectInitStr = fs.readFileSync(`${process.env.PWD}/docker/node/projectInit.json`, { encoding: 'utf8' }),
            projectInit, routeRolesService, localAcctsService;

        projectInit = JSON.parse(projectInitStr);

        if (projectInit.localAcct) {
            Log.info('Creating local account from project config.');
            localAcctsService = new laService();
            await localAcctsService.createAcct(projectInit.localAcct.username, projectInit.localAcct.password);
        }

        if (projectInit.routeRole) {
            Log.info('Assigning role to routes defined in project config.');
            routeRolesService = new rrService();
            await routeRolesService.setRouteRoles(projectInit.routeRole.route, projectInit.routeRole.role);
        }

        fs.unlink(`${process.env.PWD}/docker/node/projectInit.json`, function(err) {
            if(err && err.code === 'ENOENT') {
                console.info("Project config file doesn't exist..");
            } else if (err) {
                console.error("Error occurred while trying to remove proejct config file");
            }
        });

        console.log();
    }
    catch (e) {
        //Log.error(e);
    }
}

exports.add = addRoutes;

exports.mount = async function (app, srcPath) {
    return await addRoutes(app, routes, srcPath);
};
