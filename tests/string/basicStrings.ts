let a :number =1
let b=2;
let c = (a+(b*2));
console.log(c,"d",1);

/* mixing string and numbers */
let a0 = a + "b"
console.log(a0)
let a1 = 1 + "c"
console.log(a1)

let a11 = 1+1
console.log(a11)

//mixing string and numbers in nested parens
let a2 = a + ((2*3)+"c")
console.log(a2)

//string operations
let strLitIdentifier = "abc"
let a3 = a + ((2*3)+strLitIdentifier)
console.log(a3)
let a4 = a + (strLitIdentifier+(2*3))
console.log(a4)


let str = "abc"
let str2= str + "def"
console.log(str2)

str2 = "new value"
console.log(str2)