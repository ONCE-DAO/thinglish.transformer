interface View {
    name: String;
}
declare type Type<T> = {
    new (): T;
};
declare abstract class BaseView implements View {
    static implementations: Type<BaseView>[];
    static discover(): Type<BaseView>[];
    static get scope(): number;
    name: String;
}
declare class DefaultView extends BaseView {
    static get scope(): number;
}
declare class OverView extends BaseView {
    static get scope(): number;
}
declare class Logger {
    protected static PREFIX: string;
    log(message: string): void;
}
declare class Warner extends Logger {
    protected static PREFIX: string;
}
//# sourceMappingURL=Simple.d.ts.map