const { Log } = require('../../src/log');

Log.banner('testing: zoinx/log v0.0.1', '=');

Log.style(Log.Text.BLACK)(`FG BLACK`);
Log.style(Log.Text.RED)(`FG RED`);
Log.style(Log.Text.GREEN)(`FG GREEN`);
Log.style(Log.Text.YELLOW)(`FG YELLOW`);
Log.style(Log.Text.BLUE)(`FG BLUE`);
Log.style(Log.Text.MAGENTA)(`FG MAGENTA`);
Log.style(Log.Text.CYAN)(`FG CYAN`);
Log.style(Log.Text.WHITE)(`FG WHITE`);

Log.style(Log.Background.BLACK)(`BG BLACK`);
Log.style(Log.Background.RED)(`BG RED`);
Log.style(Log.Background.GREEN)(`BG GREEN`);
Log.style(Log.Background.YELLOW)(`BG YELLOW`);
Log.style(Log.Background.BLUE)(`BG BLUE`);
Log.style(Log.Background.MAGENTA)(`BG MAGENTA`);
Log.style(Log.Background.CYAN)(`BG CYAN`);
Log.style(Log.Background.WHITE)(`BG WHITE`);

Log.style(Log.BLINK)(`BLINK`);
Log.style(Log.BOLD)(`BOLD`);
Log.style(Log.BRIGHT)(`BRIGHT`);
Log.style(Log.UNDERLINE)(`UNDERLINE`);
Log.style(Log.DIM)(`DIM`);
Log.style(Log.REVERSE)(`REVERSE`);
Log.style(Log.HIDDEN)(`HIDDEN`);

Log.verbose(`testing zoinx/log`);
Log.debug(`testing zoinx/log`);
Log.info(`testing zoinx/log`);
Log.warn(`testing zoinx/log`);
Log.error(`testing zoinx/log`);
Log.banner(`testing zoinx/log`);
Log.json({ msg: `testing zoinx/log` });

Log.style(Log.BOLD, Log.FG.CYAN)(`
------------------------------------------------------------
 Done
------------------------------------------------------------
`);
