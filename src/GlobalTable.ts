

export class GlobalTable{

    static table = {}

    static addToTable(key, value){
        GlobalTable.table[key] = value;
    }

    static get(key){
        return GlobalTable.table[key];
    }

    static exists(key) :boolean{
        return (GlobalTable.table.hasOwnProperty(key))
    }

    static registerClass(classParam){
            let name = classParam.name

            if(name == "Console"){ //special case for console.
                name = "console";
            }

            Object.keys(classParam).map((key:any)=>{
                GlobalTable.addToTable(name+"."+key, classParam[key])
            })
    }
}