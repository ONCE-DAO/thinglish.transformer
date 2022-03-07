"use strict";
export const ViewInterfaceDescriptor = InterfaceDescriptor.register("com.some.package", "SomeComponentName", "1.0.0", "ViewInterfaceDescriptor");
class BaseView {
    static implementations = new Array();
    static discover() {
        return BaseView.implementations;
    }
    static get scope() { return 0; }
    name = typeof this;
}
class DefaultView extends BaseView {
    static {
        BaseView.implementations.push(this);
    }
    static get scope() { return 1; }
}
class OverView extends BaseView {
    static {
        BaseView.implementations.push(this);
    }
    static get scope() { return 2; }
}
BaseView.discover().forEach((view, index) => {
    let aClass = view.constructor;
    console.log("[" + (index + 1) + "] " + view.name, aClass.scope);
});
class Logger {
    static PREFIX = '[info]';
    log(message) {
        var logger = this.constructor;
        alert(logger.PREFIX + message);
    }
}
class Warner extends Logger {
    static PREFIX = '[warn]';
}
(new Logger).log('=> should be prefixed [info]');
(new Warner).log('=> should be prefixed [warn]');
