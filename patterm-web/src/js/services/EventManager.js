export class EventManager {
    constructor() {
        this.events = {};
    }

    on(event, callback) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(callback);
        return () => this.off(event, callback);
    }

    off(event, callback) {
        if (!this.events[event]) {
            return;
        }
        if (!callback) {
            delete this.events[event];
            return;
        }
        const index = this.events[event].indexOf(callback);
        if (index > -1) {
            this.events[event].splice(index, 1);
        }
    }

    emit(event, data) {
        if (!this.events[event]) {
            return;
        }
        const eventObj = data instanceof Event ? data : new CustomEvent(event, { detail: data });
        this.events[event].forEach(callback => {
            try {
                callback(eventObj.detail || eventObj);
            } catch (error) {
                console.error(`Error in ${event} callback:`, error);
            }
        });
    }

    once(event, callback) {
        const wrappedCallback = (data) => {
            callback(data);
            this.off(event, wrappedCallback);
        };
        return this.on(event, wrappedCallback);
    }

    clear() {
        this.events = {};
    }
}

export const globalEvents = new EventManager();
