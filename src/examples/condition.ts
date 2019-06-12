let ca = 3;
if (ca > 2 && ca<4) {
  console.log("I can't reach here");
} else if(ca == 4 && (4 == ca)){
    console.log("It is 4")
}else {
  console.log("Else works wonders");
}

var cb = true
let cc :any = false //"any" is used for calming the TS compiler

if(cb==cc){
    console.log("I will never be logged")
}else{
    console.log("Expect me!")
}

/*
Multi-
Line
Comment
*/

if(!cc){
    console.log("Negation?")
}

cc = true;
if(cc){
  if(1<4){
    console.log("1 is indeed less than 4")
  }
}