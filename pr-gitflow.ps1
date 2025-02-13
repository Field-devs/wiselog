Write-Output '######### START SRCRIPT PR-GITFLOW!!! #########' 
Write-Output ''

$repo = ${env:REPOSITORY_NAME}
$accesToken = ${env:ACCESS_TOKEN}
$mainBranch = ${env:MAIN_BRANCH}

Write-Output "REPOSITORY_NAME: $($repo) | ACCESSTOKEN = $($accesToken)"

$headers = New-Object "System.Collections.Generic.Dictionary[[String],[String]]"
$headers.Add("Authorization", "Basic $($accesToken)")
$headers.Add("accept", "application/json;api-version=5.1")
$headers.Add("content-type", "application/json;charset=utf-8")

$response = Invoke-RestMethod "https://dev.azure.com/devfieldcorp/Wiselog/_apis/git/repositories/$($repo)/pullRequests?searchCriteria.status=completed&searchCriteria.targetRefName=$($mainBranch)&`$top=1" -Method 'GET' -Headers $headers

$titlePr = $response.value[0].title
$sourceRefName = $response.value[0].sourceRefName
$targetRefName = $response.value[0].targetRefName  
$pullRequestId = $response.value[0].pullRequestId

Write-Output "SOURCE_REF_NAME: $($sourceRefName) | TARGET_REF_NAME = $($targetRefName)"
Write-Output ''

if ($sourceRefName -like '*hotfix*' -AND $targetRefName -eq $mainBranch)
{
  Write-Output '*************** START OPEN PRs ***************'
  
  $myArray = New-Object string[] 2
  $myArray[0] = 'refs/heads/release/dev'
  $myArray[1] = 'refs/heads/release/homolog'
       
  $val = 0
  while($val -ne 2)
  {
      $targetRefNameOutPut = $myArray[$val]
      $body = [System.Text.Encoding]::UTF8.GetBytes("{
        `n    `"description`": `"!$($pullRequestId)`",
        `n    `"sourceRefName`": `"$($mainBranch)`",
        `n    `"targetRefName`": `"$($targetRefNameOutPut)`",
        `n    `"title`": `"PR hotfix Automaticamente: $($titlePr)`"
        `n}")
      
      $response = Invoke-RestMethod "https://dev.azure.com/devfieldcorp/Wiselog/_apis/git/repositories/$($repo)/pullRequests" -Method 'POST' -Headers $headers -Body $body
              
      Write-Output "PR Open:  $($response.pullRequestId) - $($targetRefNameOutPut)"
  
      $body = "{
        `n  `"completionOptions`": {
        `n    `"bypassPolicy`": false,
        `n    `"deleteSourceBranch`": false
        `n  },
        `n  `"autoCompleteSetBy`": {
        `n    `"id`": `"$($response.createdBy.id)`"
        `n  }
        `n}"

      $response = Invoke-RestMethod "https://dev.azure.com/devfieldcorp/Wiselog/_apis/git/repositories/$($repo)/pullRequests/$($response.pullRequestId)" -Method 'PATCH' -Headers $headers -Body $body
      
      Write-Output "Set Auto Complete: $($response.createdBy.id)"

      $body = "{
      `n  `"hasDeclined`": false,
      `n  `"id`": `"$($response.createdBy.id)`",
      `n  `"vote`": 10
      `n}"

      $response = Invoke-RestMethod "https://dev.azure.com/devfieldcorp/Wiselog/_apis/git/repositories/$($repo)/pullRequests/$($response.pullRequestId)/reviewers/$($response.createdBy.id)" -Method 'PUT' -Headers $headers -Body $body
      
      Write-Output "Set Approved By: $($response.createdBy.id)"

      $val++        
  }   

  Write-Output '*************** FINISH OPEN PRs **************'
  Write-Output ''
}

  Write-Output '######### FINISH SRCRIPT PR-GITFLOW!!! #########' 