<?php
$now = date('Y-m-d H:i:s');
echo "Now: $now\n";
echo "Monday this week: " . date('Y-m-d 00:00:00', strtotime('monday this week')) . "\n";
echo "Monday last week: " . date('Y-m-d 00:00:00', strtotime('monday last week')) . "\n";
echo "Sunday last week: " . date('Y-m-d 23:59:59', strtotime('sunday last week')) . "\n";
echo "Last 2 weeks: " . date('Y-m-d 00:00:00', strtotime('-2 weeks')) . "\n";
echo "Current Quarter (Rolling 3): " . date('Y-m-01 00:00:00', strtotime('-2 months')) . "\n";
echo "Last Quarter (3 months ago): " . date('Y-m-01 00:00:00', strtotime('-3 months')) . " to " . date('Y-m-t 23:59:59', strtotime('-1 month')) . "\n";
echo "Last Year: " . date('Y-01-01 00:00:00', strtotime('-1 year')) . " to " . date('Y-12-31 23:59:59', strtotime('-1 year')) . "\n";
