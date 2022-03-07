export const ViewInterfaceDescriptor = InterfaceDescriptor.register("com.some.package", "SomeComponentName", "1.0.0", "ViewInterfaceDescriptor");
export const ItemViewInterfaceDescriptor = InterfaceDescriptor.register("com.some.package", "SomeComponentName", "1.0.0", "ItemViewInterfaceDescriptor");
export const PersisenceManagerInterfaceDescriptor = InterfaceDescriptor.register("com.some.package", "SomeComponentName", "1.0.0", "PersisenceManagerInterfaceDescriptor");
// how to define all possible interfaces....
//type InterfaceType = View | ItemView | PersisenceManager
// class MyClassDescription {
//     getClassName():String {
//         return typeof this
//     }
//     getInterfaces():InterfaceList {
//                 // //@ts-ignore
//                 // let aUcpComponent: UcpComponent =  import("ior:someClass");
//                 // let theInterfaceType: InterfaceType = View;
//                 // let anIntefaceList: InterfaceList = Reflect.metaData().get("implements");
//                 // anInterfaceList.has(theInterfaceType);
//                 // // Object.getPrototype(a).name "SomeClass"
//                 // return anIntefaceList;
//     }
// }
// class RelatedObjectStore {
//     /// we do not want any
//     private map:Map<Interface,Set<any>>=new Map();
//     add(key:Interface, value:any) {
//         let theSet = this.map.get(key) || new Set();
//         if (!theSet.has(value))
//             theSet.add(value);
//     }
//     getAllKeys() {
//         return this.map.keys();
//     }
// }
export class UcpComponent /* extends BaseThing<UcpComponent> */ {
    controller = new UcpController();
    constructor() {
        //super();
        //this.addView(ItemView, new DefaultItemView())
    }
}
class UcpController {
    //    private relatedObjectStore: RelatedObjectStore=new RelatedObjectStore();
    //                         what is this, if it is not a simple string
    //                         vvvvvvvvvvvvv
    // registerView(someInterface:Interface, instance:any) {
    //     let relatedObjects = this.relatedObjectStore.add(someInterface, instance);
    // }
    // getAllViews() {
    //     return this.relatedObjectStore.getAllKeys()
    // }
    getPM() {
    }
}
export class Person extends UcpComponent {
    firstName = "Me";
    static helloWorld() {
        console.log("Hello World");
        return 3;
    }
}
class DefaultItemView {
    name = typeof this;
}
