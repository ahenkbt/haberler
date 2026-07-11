<?php

namespace App\Services\AiWebsite\HomePage;

use App\Models\User\Skill;
use App\Services\MasterAiGenerator;
use Illuminate\Support\Str;

class SkillService
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

      Skill::where('user_id', $userId)->delete();
    }
    
    $skillData = $this->getSkillData();

    foreach ($skillData as $index => $data) {
      $title = $this->ai->generateText($data['title_prompt']);
      $cleanTitle = $this->extractCleanTitle($title);

      Skill::create([
        'user_id' => $this->ai->getUserId(),
        'language_id' => $this->ai->getDefaultLanguageId(),
        'icon' => $data['icon'],
        'title' => $cleanTitle,
        'slug' => Str::slug($cleanTitle),
        'percentage' => $data['percentage'],
        'color' => $data['color'],
        'serial_number' => $index + 1,
      ]);
    }
  }

  private function getSkillData()
  {
    $businessName = $this->ai->getBusinessName();
    $industry = $this->ai->getIndustry();
    $businessInfo = $this->ai->getBusinessInfo();

    $baseContext = "{$businessName} is a leading {$industry} company. {$businessInfo}";

    $colors = ['FF6B6B', '4ECDC4', '45B7D1', 'FFA07A', '98D8C8', 'F7DC6F'];

    return [
      [
        'title_prompt' => "You must return ONLY 2-3 words. No formatting, no explanation.
                Generate a primary skill name for {$industry} industry.
                Examples: Web Development, Digital Marketing, Project Management, UI UX Design
                Context: {$baseContext}",
        'icon' => 'fas fa-code',
        'percentage' => rand(85, 98),
        'color' => $colors[0],
      ],
      [
        'title_prompt' => "You must return ONLY 2-3 words. No formatting, no explanation.
                Generate a core technical skill for {$industry} business.
                Examples: Data Analysis, Cloud Solutions, Mobile Development, API Integration
                Context: {$baseContext}",
        'icon' => 'fas fa-chart-line',
        'percentage' => rand(80, 95),
        'color' => $colors[1],
      ],
      [
        'title_prompt' => "You must return ONLY 2-3 words. No formatting, no explanation.
                Generate a strategic skill for {$industry} company.
                Examples: Business Strategy, Brand Identity, SEO Optimization, Content Creation
                Context: {$baseContext}",
        'icon' => 'fas fa-lightbulb',
        'percentage' => rand(75, 92),
        'color' => $colors[2],
      ],
      [
        'title_prompt' => "You must return ONLY 2-3 words. No formatting, no explanation.
                Generate a customer-facing skill for {$industry} sector.
                Examples: Client Relations, Customer Support, Quality Assurance, User Experience
                Context: {$baseContext}",
        'icon' => 'fas fa-users',
        'percentage' => rand(85, 97),
        'color' => $colors[3],
      ],

    ];
  }

  private function extractCleanTitle($text)
  {

    $text = preg_replace('/^(Here are|Options:|Choose from:).*/i', '', $text);

    $text = preg_replace('/[*_#`~\[\]]/', '', $text);

    $text = preg_replace('/^[\s\-•]+/', '', $text);
    $text = preg_replace('/\n.*$/s', '', $text);

    return trim($text);
  }
}
