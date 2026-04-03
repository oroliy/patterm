describe('web debug utility', () => {
    beforeEach(() => {
        jest.resetModules();
        global.localStorage = {
            getItem: jest.fn(() => 'false'),
            setItem: jest.fn(),
        };
        global.window = {
            location: {
                search: '',
            },
        };
    });

    test('setDebugEnabled persists the flag and debug logging respects enablement', () => {
        const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
        const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
        const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        const { setDebugEnabled, debug } = require('../shared/js/debug.js');

        setDebugEnabled(true);
        expect(localStorage.setItem).toHaveBeenCalledWith('patterm_debug', 'true');

        debug.log('silent');
        debug.warn('silent');
        debug.error('always');
        expect(logSpy).not.toHaveBeenCalled();
        expect(warnSpy).not.toHaveBeenCalled();
        expect(errorSpy).toHaveBeenCalledWith('[Patterm]', 'always');

        localStorage.getItem.mockReturnValue('true');
        debug.log('visible');
        debug.warn('visible');
        expect(logSpy).toHaveBeenCalledWith('[Patterm]', 'visible');
        expect(warnSpy).toHaveBeenCalledWith('[Patterm]', 'visible');

        logSpy.mockRestore();
        warnSpy.mockRestore();
        errorSpy.mockRestore();
    });

    test('debug utility also enables logging from URL params and no-ops without window', () => {
        const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
        const { debug, setDebugEnabled } = require('../shared/js/debug.js');

        window.location.search = '?pattermDebug=1';
        debug.log('from-url');
        expect(logSpy).toHaveBeenCalledWith('[Patterm]', 'from-url');

        delete global.window;
        expect(() => setDebugEnabled(false)).not.toThrow();

        logSpy.mockRestore();
    });
});
