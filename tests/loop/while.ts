let i = 0;
let z = 0;

while(i<10){
    console.log(i);
    i = i + 1;
    let z = i; //variable re-writing for scopes
    console.log(z)
}

let j=0;
while(j<10){
    console.log(j);
    j = j + 1;
    let k = 0;

    while(k<10){
        console.log(k)
        k = k + 1;
    }
    console.log("------");
}

console.log(z);