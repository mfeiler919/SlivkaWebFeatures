<?php
header('Content-type: text/html; charset=utf-8');
require_once "./PointsCenter.php";
$points_center = new PointsCenter();
$quarter_info = $points_center->getQuarterInfo();
$slivkans = $points_center->getSlivkans();
$events = $points_center->getEvents($quarter_info->start_date,$quarter_info->end_date);
$points = $points_center->getPoints();
$helperpoints = $points_center->getHelperPoints();
$committeeattendance = $points_center->getCommitteeAttendance();
$bonuspoints = $points_center->getBonusPoints();

#performing 1000 times for performance analysis
$durations = array();
for($i=0; $i<1; $i++){
	$s_strt = microtime(true);
	$points_table = array(); #table that is slivkan count by event count + 6
	$im_points = array(); #stores events_total, helper_points, im_points

	#form points_table
	$events_count = count($events['event_name']);
	$events_total_ind		= $events_count + 2;
	$helper_points_ind		= $events_count + 3;
	$im_points_ind			= $events_count + 4;
	$committee_points_ind	= $events_count + 5;
	$bonus_points_ind		= $events_count + 6;
	$total_ind				= $events_count + 7;

	for($s=0; $s < count($slivkans); $s++){
		$points_table[$slivkans[$s]['nu_email']] = array_merge(array($slivkans[$s]['full_name'], $slivkans[$s]['gender']), array_fill('1', $events_count+6, 0));
	}

	for($e=0; $e < $events_count; $e++){
		$event_name = $events['event_name'][$e];
		$is_im = $events['type'][$e] == "im";

		foreach($points[$event_name] as $s){
			#temporary since im dealing with ex-slivkans
			if(array_key_exists($s, $points_table)){
				$points_table[$s][2+$e] = 1;

				if(!$is_im){
					$points_table[$s][$events_total_ind]++;
				}else{
					$im_points[$s][$events['description'][$e]]++;
				}
			}
		}

		foreach($helperpoints[$event_name] as $s){
			#temporary since im dealing with ex-slivkans
			if(array_key_exists($s, $points_table)){
				$points_table[$s][2+$e] += 0.1;
				$points_table[$s][$helper_points_ind]++;
			}
		}

		foreach($committeeattendance[$event_name] as $s){
			#temporary since im dealing with ex-slivkans
			if(array_key_exists($s, $points_table)){
				$points_table[$s][2+$e] += 0.2;
			}
		}
	}

	#handling IMs
	foreach(array_keys($im_points) as $s){
		$im_points_total = 0;

		foreach($im_points[$s] as $im){
			if($im >= 3){ $im_points_total += $im; }
		}
		if($im_points_total > 15){ $im_points_total = 15; }

		$points_table[$s][$im_points_ind] = $im_points_total;
	}

	foreach(array_keys($bonuspoints) as $s){
		#temporary since im dealing with ex-slivkans
		if(array_key_exists($s, $points_table)){
			$points_table[$s][$helper_points_ind] += $bonuspoints[$s]['helper']; #bonus helper points
			$points_table[$s][$committee_points_ind] = (int)$bonuspoints[$s]['committee'];
			$points_table[$s][$bonus_points_ind] =
				$bonuspoints[$s]['other1'] +
				$bonuspoints[$s]['other2'] +
				$bonuspoints[$s]['other3'];
		}
	}

	#run through whole points table to finish up
	foreach(array_keys($points_table) as $s){
		#handling helper points max
		if($points_table[$s][$helper_points_ind] > 5){ $points_table[$s][$helper_points_ind] = 5; }

		$points_table[$s][$total_ind] = array_sum(array_slice($points_table[$s], $events_total_ind, 6));
	}


	$durations[] = microtime(true) - $s_strt;
}

if(false){
	$total = array_sum($durations);
	echo "Time for 100: " . $total . "<br/>";
	$stats = new stats($durations,$durations);

	echo "Variance: " . $stats->variance() . "<br/>";

	echo "Average execution time: " . $total/count($durations) . "<br/>";
}

/*for($s=0; $s < count($slivkans); $s++){
	$events_total = 0;
	$event_points = array();
	$helper_points = 0;
	$im_points = array();
	$nu_email = $slivkans[$s]['nu_email'];

	for($e=0; $e < count($events['event_name']); $e++){
		$event_name = $events['event_name'][$e];

		if(in_array($nu_email, $points[$event_name])){
			$event_points_tmp = 1;
			if($events['type'][$e] != "im"){
				$events_total++;
			}else{
				$im_points[$events['description'][$e]]++;
			}
		}else{
			$event_points_tmp = 0;
		}

		if(in_array($nu_email, $helperpoints[$event_name])){   # Add .1 for helper point
			$event_points_tmp += 0.1;
			$helper_points++;
		}elseif(in_array($nu_email, $committeeattendance[$event_name])){ # Add .2 for committee point
			$event_points_tmp += 0.2;
		}

		$event_points[] = $event_points_tmp;
	}

	$helper_points += $bonuspoints[$nu_email]['helper']; #bonus helper points

	#handling helper points max
	if($helper_points > 5){
		$helper_points = 5;
	}

	#handling IMs:
	$im_points_actual = 0;
	foreach($im_points as $im){
		if($im >= 3){ $im_points_actual += $im; }
	}
	if($im_points_actual > 15){ $im_points_actual = 15; }

	#handling bonus points:
	$bonus_points = 0;
	$committee_points = 0;
	if(array_key_exists($nu_email,$bonuspoints)){
		$bonus_points = $bonuspoints[$nu_email]['other1']+$bonuspoints[$nu_email]['other2']+$bonuspoints[$nu_email]['other3'];
		$committee_points = $bonuspoints[$nu_email]['committee'];
	}

	$total = $events_total + $helper_points + $im_points_actual + $bonus_points + $committee_points;

	$points_table[$slivkans[$s]['full_name']] = array_merge(
		array($slivkans[$s]['full_name'],$slivkans[$s]['gender']),
		$event_points,
		array($events_total,$helper_points,$im_points_actual,$committee_points,$bonus_points,$total)
	);
}*/

echo json_encode(array(points_table => $points_table, events => $events));
?>