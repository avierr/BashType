i=0

z=0

while  ((  $(($i < 10)) )) ; do 
  
  echo  "$i"

  i=$(($i + 1))
  z=$i

done
j=0

while  ((  $(($j < 10)) )) ; do 
  
  echo  "$j"

  j=$(($j + 1))
  k=0

  while  ((  $(($k < 10)) )) ; do 
    
    echo  "$k"
    k=$(($k + 1))

  done
  
  echo  "------"


done

echo  "$z"
