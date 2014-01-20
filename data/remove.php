<?php

$_data = json_decode(file_get_contents('php://input'));

$id    = $_data->{'id'};



$dbhost = 'localhost:3036';
$dbuser = 'root';
$dbpass = 'kakroot';
$conn = mysql_connect($dbhost, $dbuser, $dbpass);
if(! $conn )
{
  die('Could not connect: ' . mysql_error());
}
$sql = 'DELETE FROM postits '.
       'WHERE id='.$id;

mysql_select_db('kanban');
$retval = mysql_query( $sql, $conn );
if(! $retval )
{
  die('Could not enter data: ' . mysql_error());
}
echo "Entered data successfully\n";
mysql_close($conn);






?>
