import { View } from "./interfaces/ucpInterfaces"

//import { TestView } from "ior:esm:git:tla.EAM.Once"

type Type<T> = { new(): T }

abstract class BaseView implements View {
    static implementations = new Array<Type<BaseView>>()
    static discover() {
        return BaseView.implementations
    }


    static get scope() { return 0 }

    name: String = typeof this


    // static {
    //     BaseView.implementations.push(this)
    // }

}


class DefaultView extends BaseView {// implements TestView {
    static {
        BaseView.implementations.push(this)
    }
    static get scope() { return 1 }
}

class OverView extends BaseView {
    static {
        BaseView.implementations.push(this)
    }
    static get scope() { return 2 }
}

BaseView.discover().forEach((view: BaseView, index) => {
    let aClass = <typeof BaseView>view.constructor
    console.log("[" + (index + 1) + "] " + view.name, aClass.scope)
})

class Logger {
    protected static PREFIX = '[info]';
    public log(message: string): void {
        var logger = <typeof Logger>this.constructor;
        alert(logger.PREFIX + message);
    }
}

class Warner extends Logger {
    protected static PREFIX = '[warn]';
}

(new Logger).log('=> should be prefixed [info]');
(new Warner).log('=> should be prefixed [warn]');