<?php

namespace App\Services\AiWebsite;

use App\Models\User\Social;
use App\Services\MasterAiGenerator;

class SocialService
{
  protected $ai;
  protected $isDeleteOldRecords;

  public function __construct(MasterAiGenerator $ai)
  {
    $this->ai = $ai;
    $this->isDeleteOldRecords = $this->ai->isDeleteOldRecords();
  }

  public function generate()
  {
    // delete old records 
    if ($this->isDeleteOldRecords) {
      $userId = $this->ai->getUserId();

      Social::where('user_id', $userId)->delete();
    }

    $socialData = $this->getSocialData();

    foreach ($socialData as $index => $data) {
      Social::create([
        'user_id' => $this->ai->getUserId(),
        'icon' => $data['icon'],
        'url' => $data['url'],
        'serial_number' => $index + 1,
      ]);
    }
  }

  private function getSocialData()
  {
    $businessName = $this->ai->getBusinessName();

    // Generate clean business name for social URLs 
    $businessHandle = strtolower(str_replace([' ', '.', ',', '&'], '', $businessName));

    if (strlen($businessHandle) > 20) {
      $words = explode(' ', $businessName);
      $businessHandle = strtolower($words[0]);
    }

    return [
      [
        'icon' => 'fab fa-facebook-f',
        'url' => 'https://www.facebook.com/' . $businessHandle,
      ],
      [
        'icon' => 'fab fa-twitter',
        'url' => 'https://twitter.com/' . $businessHandle,
      ],
      [
        'icon' => 'fab fa-linkedin-in',
        'url' => 'https://www.linkedin.com/company/' . $businessHandle,
      ],
      [
        'icon' => 'fab fa-instagram',
        'url' => 'https://www.instagram.com/' . $businessHandle,
      ],
      [
        'icon' => 'fab fa-youtube',
        'url' => 'https://www.youtube.com/@' . $businessHandle,
      ],
    ];
  }
}
