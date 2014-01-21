<?php
$_insert = json_decode(file_get_contents('php://input'));


 $id    = $_insert->{'id'};
 $text    = $_insert->{'text'};
 $size    = $_insert->{'size'};
 $scale    = $_insert->{'scale'};
 $color    = $_insert->{'color'};
 $textcolor    = $_insert->{'textcolor'};
 $x    = $_insert->{'x'};
 $y    = $_insert->{'y'};



$dbhost = 'localhost';
$dbuser = 'kanban';
$dbpass = 'k4nb4n';
$conn = mysql_connect($dbhost, $dbuser, $dbpass);
if(! $conn )
{
  die('Could not connect: ' . mysql_error());
}
$sql = 'INSERT INTO postits '.
       '(id,text, size,scale,color, textcolor,x,y) '.
       'VALUES ( '.$id.', "'.$text.'",'.$size.', '.$scale.',"'.$color.'", "'.$textcolor.'", '.$x.','.$y.')';

mysql_select_db('kanban');
$retval = mysql_query( $sql, $conn );
if(! $retval )
{
  die('Could not enter data: ' . mysql_error());
}
echo "Entered data successfully\n";
mysql_close($conn);






?>
