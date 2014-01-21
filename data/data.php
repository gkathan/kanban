<?php
// Make a MySQL Connection


$type = htmlspecialchars($_GET["type"]);


	mysql_connect("localhost", "kanban", "k4nb4n") or die(mysql_error());
	mysql_select_db("kanban") or die(mysql_error());

	mysql_query('SET CHARACTER SET utf8');
	// Get all the data from the "example" table
	$result = mysql_query("SELECT * FROM ".$type)
	or die(mysql_error());  

	$arr = array();

	// keeps getting the next row until there are no more to get
	while($row = mysql_fetch_object( $result )) {
		$arr[]=$row;
	} 
	echo json_encode($arr);



?>
