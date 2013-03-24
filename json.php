<?php

require 'db.php';

$user_uid = 39;

//unlink('cache/data.json');

if (file_exists('cache/data.json')) {
	$modified = filemtime('cache/data.json');
	if (time() - $modified < 3600)
		exit(file_get_contents('cache/data.json'));
}

try {
	$DBH = new PDO("mysql:host=$host;dbname=$dbname", $user, $pass);
}
catch(PDOException $e) {
    echo $e->getMessage();
}

$STH = $DBH->prepare("SELECT 
tasks.uid, 
tasks.project_uid,
tasks.description,
task_status.name AS status, 
project.start_date, 
project.deadline, 
tasks.datetime,
tasks.billedTime AS duration
FROM tasks 
LEFT JOIN task_statuses AS task_status ON task_status.uid = tasks.task_status_uid
INNER JOIN projects AS project ON tasks.project_uid = project.uid AND user_uid > 0
INNER JOIN project_statuses project_status on project_status.uid = project.project_status_uid
LEFT JOIN user on tasks.user_uid = user.id
WHERE project_status.complete = 0 AND project_status.name != 'Request' AND approval_status_uid = 1 AND user_uid = ?
ORDER BY project_uid, tasks.datetime DESC");

$STH->execute(array($user_uid));
$STH->setFetchMode(PDO::FETCH_ASSOC);

while($row = $STH->fetch()) {
	$tasks[$row['project_uid']][] = $row;
}

$STH = $DBH->prepare("SELECT 
project.uid, 
project.department_uid,
client.name AS client, 
IF(project.summary IS NULL OR project.summary = '', project.name, project.summary) As summary, 
project.description,
project_status.name AS status, 
#department.name,
project.start_date, 
project.deadline, 
max(tasks.datetime) AS last_logged, 
estimated_time, 
sum(duration), 
group_concat(DISTINCT CONCAT(LEFT(user.firstName, 1), LEFT(user.lastName, 1)) SEPARATOR ', ') AS people, 
(SELECT max(datetime) from tasks where user_uid = ? and project_uid = project.uid LIMIT 1) AS last_time_i_logged
from projects project 
INNER JOIN project_statuses project_status on project_status.uid = project.project_status_uid 
INNER JOIN clients client ON client.uid = project.client_uid
left join tasks on tasks.project_uid = project.uid AND user_uid > 0
left join user on tasks.user_uid = user.id
where project_status.complete = 0 and project_status.name != 'Request' and approval_status_uid = 1
group by project.uid
order by last_time_i_logged DESC, last_logged DESC");

$STH->execute(array($user_uid));
$STH->setFetchMode(PDO::FETCH_ASSOC);

while($row = $STH->fetch()) {
	if (isset($tasks[$row['uid']]))
		$row['tasks'] = $tasks[$row['uid']];
	$array['tickets'][] = $row;
}

$array['departments'] = array(
	1 => 'Project',
	2 => 'SEO',
	3 => 'Support',
	4 => 'Internal'
);

$array['last_updated'] = date('r');

$contents = json_encode($array);

file_put_contents('cache/data.json', $contents);

echo $contents;
