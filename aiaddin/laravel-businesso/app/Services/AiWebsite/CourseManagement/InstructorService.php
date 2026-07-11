<?php

namespace App\Services\AiWebsite\CourseManagement;


use App\Models\User\Language;
use App\Services\MasterAiGenerator;
use App\Models\User\CourseManagement\Instructor\Instructor;

class InstructorService
{
  protected $ai;
  protected $imagePath = 'assets/tenant/image/instructors/';
  protected $isDeleteOldRecords;

  public function __construct(MasterAiGenerator $ai)
  {
    $this->ai = $ai;
    $this->isDeleteOldRecords = $this->ai->isDeleteOldRecords();
  }

  public function generate(int $count = 2)
  {
    // delete old records
    if ($this->isDeleteOldRecords) {
      $userId = $this->ai->getUserId();

      $oldInstructors = Instructor::where('user_id', $userId)->get();

      foreach ($oldInstructors as $instructor) {
        if ($instructor->image && file_exists(public_path($this->imagePath . $instructor->image))) {
          @unlink(public_path($this->imagePath . $instructor->image));
        }
      }

      Instructor::where('user_id', $userId)->delete();
    }

    $userId        = $this->ai->getUserId();
    $defaultLangId = $this->ai->getDefaultLanguageId();

    $language = Language::where('id', $defaultLangId)
      ->where('user_id', $userId)
      ->first();

    if (!$language) {
      return;
    }

    $definitions = $this->getInstructorDefinitions($count);

    foreach ($definitions as $def) {

      $imageName = $this->ai->generateImage(
        $def['image_prompt'],
        370,
        370,
        $this->imagePath
      );

      $rawName        = $this->ai->generateText($def['name_prompt']);
      $rawOccupation  = $this->ai->generateText($def['occupation_prompt']);
      $rawDescription = $this->ai->generateText($def['description_prompt']);

      $name        = $this->extractSingleLine($rawName, 60);
      $occupation  = $this->extractSingleLine($rawOccupation, 80);
      $description = $this->extractCleanHtmlSafe($rawDescription, 600);

      Instructor::create([
        'language_id' => $language->id,
        'user_id'     => $userId,
        'image'       => $imageName,
        'name'        => $name,
        'occupation'  => $occupation,
        'description' => $description,
        'is_featured' => $def['is_featured'] ? 1 : 0,
      ]);
    }
  }

  /**
   * Different instructor profiles config.
   */
  private function getInstructorDefinitions(int $count): array
  {
    $businessName = $this->ai->getBusinessName();
    $industry     = $this->ai->getIndustry();
    $info         = $this->ai->getBusinessInfo();

    $baseContext  = "{$businessName} offers {$industry}-related courses and training. {$info}";
    $qualityEnhancer = ", shot with professional DSLR camera, 85mm portrait lens, hyperrealistic facial details, sharp focus on eyes, natural skin texture with pores, individual unique faces, detailed iris and pupils, realistic human imperfections, studio quality lighting";

    $negativePrompt = ", AVOID: soft blurry faces, plastic skin, airbrushed look, cloned faces, synthetic appearance, uniform features, doll-like skin, low detail eyes";
    $base = [
      [
        'is_featured' => true,
        'name_prompt' => "You must return ONLY a realistic full name. No formatting, no explanation.
                Examples: Sarah Ahmed, David Johnson, Mehedi Hasan
                Output: Just the name, nothing else.",

        'occupation_prompt' => "You must return ONLY 3-6 words. No formatting, no explanation.
                Generate a course instructor title for {$industry}.
                Examples: Senior Data Science Instructor, Full-Stack Web Development Mentor, Digital Marketing Strategist
                Output: Just the title, nothing else.
                Context: {$baseContext}",

        'description_prompt' => "You must return 90-130 words. No formatting, no explanation.
                Write a short instructor bio in third person.
                Include: years of experience, area of expertise, teaching style, what students can expect.
                Tone: professional, friendly, encouraging.
                Output: Plain text only, 90-130 words.
                Context: {$baseContext}",

        'image_prompt' => "Professional headshot of course instructor, neutral background, friendly expression, studio lighting, realistic photo style, {$industry} educator" . $qualityEnhancer . $negativePrompt,
      ],
      [ 
        'is_featured' => true,
        'name_prompt' => "You must return ONLY a realistic full name. No formatting, no explanation.
                Output: Just the name, nothing else.",

        'occupation_prompt' => "You must return ONLY 3-6 words. No formatting, no explanation.
                Generate a niche instructor role for {$industry}.
                Examples: UI UX Design Coach, Cloud Computing Expert, SEO and Content Trainer
                Output: Just the title, nothing else.
                Context: {$baseContext}",

        'description_prompt' => "You must return 90-130 words. No formatting, no explanation.
                Write an expert instructor bio.
                Focus on: specialization, real-world projects, tools/technologies used, benefits for learners.
                Output: Plain text only, 90-130 words.
                Context: {$baseContext}",

        'image_prompt' => "Professional portrait of specialist instructor, half-body shot, office or classroom background, realistic photography, {$industry} trainer" . $qualityEnhancer . $negativePrompt,
      ],
    ];

    $result = [];
    for ($i = 0; $i < $count; $i++) {
      $result[] = $base[$i % count($base)];
    }

    return $result;
  }

  private function extractSingleLine(string $text, int $maxLen): string
  {
    $text = preg_replace('/^(Here are|Here is|Sure|Certainly)/i', '', $text);
    $text = preg_replace('/[*_#`~\[\]<>]/', '', $text);
    $text = preg_replace('/\r?\n.*/s', '', $text);
    $text = preg_replace('/\s+/', ' ', $text);
    $text = trim($text);

    if (strlen($text) > $maxLen) {
      $text = substr($text, 0, $maxLen);
    }

    return $text;
  }

  private function extractCleanHtmlSafe(string $text, int $maxLen): string
  {
    $text = preg_replace('/^(Here are|Here is|Sure|Certainly)/i', '', $text);
    $text = preg_replace('/[*_#`~\[\]<>]/', '', $text);
    $text = preg_replace('/\s+/', ' ', $text);
    $text = trim($text);

    if (strlen($text) > $maxLen) {
      $text = substr($text, 0, $maxLen);
    }

    return $text;
  }
}
