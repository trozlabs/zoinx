const { Log } = require('./index.js');

Log.style(Log.FG.BLACK)(`FG BLACK`);
Log.style(Log.FG.RED)(`FG RED`);
Log.style(Log.FG.GREEN)(`FG GREEN`);
Log.style(Log.FG.YELLOW)(`FG YELLOW`);
Log.style(Log.FG.BLUE)(`FG BLUE`);
Log.style(Log.FG.MAGENTA)(`FG MAGENTA`);
Log.style(Log.FG.CYAN)(`FG CYAN`);
Log.style(Log.FG.WHITE)(`FG WHITE`);

Log.style(Log.BG.BLACK)(`BG BLACK`);
Log.style(Log.BG.RED)(`BG RED`);
Log.style(Log.BG.GREEN)(`BG GREEN`);
Log.style(Log.BG.YELLOW)(`BG YELLOW`);
Log.style(Log.BG.BLUE)(`BG BLUE`);
Log.style(Log.BG.MAGENTA)(`BG MAGENTA`);
Log.style(Log.BG.CYAN)(`BG CYAN`);
Log.style(Log.BG.WHITE)(`BG WHITE`);

Log.style(Log.BLINK)(`BLINK`);
Log.style(Log.BOLD)(`BOLD`);
Log.style(Log.BRIGHT)(`BRIGHT`);
Log.style(Log.UNDERLINE)(`UNDERLINE`);
Log.style(Log.DIM)(`DIM`);
Log.style(Log.REVERSE)(`REVERSE`);
Log.style(Log.HIDDEN)(`HIDDEN`);

Log.verbose(`testing zoinx/log`);
Log.info(`testing zoinx/log`);
Log.debug(`testing zoinx/log`);
Log.warn(`testing zoinx/log`);
Log.error(`testing zoinx/log`);
Log.banner(`testing zoinx/log`);
Log.json({ msg: `testing zoinx/log` });
