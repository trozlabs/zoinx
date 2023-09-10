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

require('express-async-errors');

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
    const directories = ['./validatedAuths', './routeRoles', './localAccts'];

    try {
        for (let i = 0; i < directories.length; i++) {
            const router = require(`${directories[i]}/index.js`);
            routeGroups.push(new router(app));
        }

        routeGroups.forEach((route) => {
            Object.assign(routes, route.getRoutes());
        });
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
            routeGroups.forEach((route) => {
                Object.assign(routes, route.getRoutes());
            });

            Object.keys(routes).forEach(function (name) {
                const route = this[name];
                try {
                    defs.push({ name, uri: route.base });
                    app.use(route.base, route.router);
                    Log.debug('Initialized: ' + route.base);
                } catch (err) {
                    console.log('Failed to mount router', route.base);
                    Log.error(err.stack);
                }
            }, routes);

            addMissingRouteRoles(routes);

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
                existingRouteRoles, routeKeys, roleHandles;

            existingRouteRoles = await routeRolesService.find({});

            routeKeys = Object.keys(routes);
            for (let i=0; i<routeKeys.length; i++) {
                roleHandles = routes[routeKeys[i]].router.roleHandles;
                if (!_.isEmpty(roleHandles)) {
                    for (let j=0; j<roleHandles.length; j++) {
                        checkArray.push(`${roleHandles[j].route_method}=>${roleHandles[j].route_path}`);
                    }
                }
            }

            for (i=0; i<existingRouteRoles.length; i++) {
                checkArrayExisting.push(
                    `${existingRouteRoles[i].get('route_method')}=>${existingRouteRoles[i].get('route_path')}`
                );
            }

            const missingRouteRoles = checkArray.filter(item1 => !checkArrayExisting.some(item2 => (item1 === item2)));

            if (missingRouteRoles.length > 0) {
                await routeRolesService.batchInsert(missingRouteRoles);
                Log.info(`Added ${missingRouteRoles.length} routes to routeRoles`);
            }

            if (checkArray.length !== existingRouteRoles.length) {
                function findMissingRoutes(arr1, arr2) {
                    return arr1.filter(
                        (element) => !arr2.includes(element)
                    );
                }
                let missingRoutes = findMissingRoutes(checkArrayExisting, checkArray);
                for (i=0; i<missingRoutes.length; i++) {
                    Log.info(`${missingRoutes[0]} has permissions assigned but no matching routes in application. Might need to delete existing permissions from DB.`);
                }

            }
        }
    }
    catch (e) {
        Log.warn(e.message);
    }

}

exports.add = addRoutes;

exports.mount = async function (app, srcPath) {
    return await addRoutes(app, routes, srcPath);
};
