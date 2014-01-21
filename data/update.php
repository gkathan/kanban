<?php

$_data = json_decode(file_get_contents('php://input'));

 $id    = $_data->{'id'};
 $text    = $_data->{'text'};
 $size    = $_data->{'size'};
 $scale    = $_data->{'scale'};
 $color    = $_data->{'color'};
 $textcolor    = $_data->{'textcolor'};
 $x    = $_data->{'x'};
 $y    = $_data->{'y'};



$dbhost = 'localhost';
$dbuser = 'kanban';
$dbpass = 'k4nb4n';
$conn = mysql_connect($dbhost, $dbuser, $dbpass);
if(! $conn )
{
  die('Could not connect: ' . mysql_error());
}
$sql = 'UPDATE postits SET '.
	   'x='.$x.',y='.$y.' '.
       'WHERE id='.$id;

echo "sql: ".$sql;
mysql_select_db('kanban');
$retval = mysql_query( $sql, $conn );
if(! $retval )
{
  die('Could not update data: ' . mysql_error());
}
echo "updated data successfully\n";
mysql_close($conn);






?>
