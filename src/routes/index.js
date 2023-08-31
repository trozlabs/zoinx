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
    const directories = ['./validatedAuths'];

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

            // Add Middleware functions here.
            app.use(error);

            app.use('/help', (req, res) => res.status(200).send({ routes: defs }));
        }
    } catch (ex) {
        console.log(ex);
    }
    return routes;
}

exports.add = addRoutes;

exports.mount = async function (app, srcPath) {
    return await addRoutes(app, routes, srcPath);
};
