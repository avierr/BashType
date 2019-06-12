function bashtype_is_num {
    local re='^[0-9]+$'
    if ! [[ $1 =~ $re ]] ; then
        echo "NaN"
    else
        echo "NUMBER"
    fi 
}

function bashtype_add_or_concat  {
    if [[ $(bashtype_is_num $1) == "NUMBER" &&  $(bashtype_is_num $2) == "NUMBER" ]]; then
        echo $(($1 + $2))
    else
        echo "$1$2"
    fi
}
