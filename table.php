<!DOCTYPE HTML>
<html lang="en" manifest="pointscenter.appcache">
<head>
  <?php include('header.html'); ?>
  <meta name="viewport" content="user-scalable=yes">
  <title>Table - Slivka Points Center</title>
  <link rel="stylesheet" href="css/pointsTable.css" />
  <script type="text/javascript" src="DataTables/media/js/jquery.dataTables.min.js"></script>
</head>
<body>
	<div class="container-fluid">
    <div class="content">
      <?php include('nav.html'); ?>
      <div class="col">
        <table id="table"></table>
      </div>
    </div>
	</div>
  <script type="text/javascript">
    $(document).ready(function(){ pointsCenter.table.init(); });
  </script>
</body>
</html>
