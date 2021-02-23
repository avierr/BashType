let a = 1;
let b = 0;
let temp=0;
let num = 22; //choose a number

while (num >= 0){
    temp = a;
    a = a + b;
    b = temp;
    num = num -1;
}

console.log(b)
