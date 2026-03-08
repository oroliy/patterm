export class BaseSerialProvider {
    constructor() {
        this.config = null;
        this.isConnected = false;
        this.eventCallbacks = {
            data: [],
            error: [],
            close: [],
            open: []
        };
    }

    on(event, callback) {
        if (this.eventCallbacks[event]) {
            this.eventCallbacks[event].push(callback);
        }
    }

    off(event, callback) {
        if (!this.eventCallbacks[event]) {
            return;
        }

        if (!callback) {
            this.eventCallbacks[event] = [];
            return;
        }

        const index = this.eventCallbacks[event].indexOf(callback);
        if (index > -1) {
            this.eventCallbacks[event].splice(index, 1);
        }
    }

    emit(event, data) {
        if (!this.eventCallbacks[event]) {
            return;
        }

        this.eventCallbacks[event].forEach((callback) => {
            try {
                callback(data);
            } catch (error) {
                console.error(`Error in ${event} callback:`, error);
            }
        });
    }

    setConfig(config) {
        this.config = config ? { ...config } : null;
    }

    setConnected(isConnected) {
        this.isConnected = Boolean(isConnected);
    }

    getConfig() {
        return this.config ? { ...this.config } : null;
    }

    getState() {
        return {
            isConnected: this.isConnected,
            config: this.getConfig()
        };
    }
}
