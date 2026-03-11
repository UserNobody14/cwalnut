\ Implementation of immutable list processing words in Forth

\ A list is a pointer to a cons cell, or 0 for an empty list.
\ A cons cell is two cells in memory:
\ addr + 0: car (the value)
\ addr + 1 cell: cdr (pointer to the next cons cell)

HERE 2 CELLS ALLOT
CONSTANT list-recursion-check

: create-empty-list ( -- 0 )
  0
;

: cons ( list headvalue -- new-list-addr )
    { list headvalue } \ Pop headvalue and list from stack into locals
    2 CELLS ALLOCATE THROW >R \ Allocate memory, R:( new-addr )

    headvalue R@ !          \ Store car (headvalue)
    list  R@ CELL+ !    \ Store cdr (list)

    R> \ Push new-addr back to data stack
;

: is-empty ( list -- list bool )
    DUP 0=
;

: car ( list -- value )
    DUP 0= IF
        CR ." ERROR: car on empty list" ABORT
    THEN
    @
;

: cdr ( list -- next-list-addr )
    DUP 0= IF
        CR ." ERROR: cdr on empty list" ABORT
    THEN
    CELL+ @
;

: (dup-list) ( orig-list-addr -- new-list-addr )
    DUP 0= IF EXIT THEN \ Return 0 if list is empty

    \ Check for recursion to avoid infinite loops on circular lists
    list-recursion-check @ OVER = IF
        CR ." ERROR: Circular list detected in dup-list" ABORT
    THEN

    \ Save old recursion check value, set new one for recursive call
    list-recursion-check @ >R
    DUP list-recursion-check !

    \ Recurse for cdr
    DUP cdr RECURSE

    \ Restore old recursion check value
    R> list-recursion-check !
    
    \ After recursion, stack is ( orig-node-addr duplicated-cdr-addr )
    \ Cons original car with duplicated cdr
    >R car R> SWAP cons
;

: dup-list ( list -- list new-list )
    2DUP \ ( list list )
    0 list-recursion-check ! \ Reset recursion check
    (dup-list)
;

\ Non-functional, but useful for memory management
: free-list ( list -- )
    BEGIN
        DUP
    WHILE
        DUP cdr SWAP \ ( next-list-addr current-list-addr )
        FREE THROW   \ ( next-list-addr )
    REPEAT
    DROP
;

: print-list ( list -- )
    ." ( "
    BEGIN
        DUP
    WHILE
        DUP car .
        cdr
    REPEAT
    DROP
    ." )"
;
