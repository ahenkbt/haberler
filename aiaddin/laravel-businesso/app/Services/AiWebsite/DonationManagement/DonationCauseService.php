<?php

namespace App\Services\AiWebsite\DonationManagement;

use App\Models\User\DonationManagement\Donation;
use App\Models\User\DonationManagement\DonationContent;
use App\Models\User\DonationManagement\DonationCategories;
use App\Models\User\Language;
use App\Services\MasterAiGenerator;


class DonationCauseService
{
  protected $ai;

  protected $imagePath = 'assets/tenant/image/cause/';
  protected $isDeleteOldRecords;

  public function __construct(MasterAiGenerator $ai)
  {
    $this->ai = $ai;
    $this->isDeleteOldRecords = $this->ai->isDeleteOldRecords();
  }

  public function generate(int $count = 3)
  {
    // delete old records
    if ($this->isDeleteOldRecords) {
      $userId = $this->ai->getUserId();

      $oldDonations = Donation::where('user_id', $userId)->get();

      foreach ($oldDonations as $donation) {
        if ($donation->image && file_exists(public_path($this->imagePath . $donation->image))) {
          @unlink(public_path($this->imagePath . $donation->image)); 
        }
      }

      DonationContent::whereHas('donation', function ($q) use ($userId) {
        $q->where('user_id', $userId);
      })->delete();

      Donation::where('user_id', $userId)->delete();
    }

    $userId        = $this->ai->getUserId();
    $defaultLangId = $this->ai->getDefaultLanguageId();

    $language = Language::where('id', $defaultLangId)
      ->where('user_id', $userId)
      ->first();

    if (!$language) {
      return;
    }

    $categories = DonationCategories::where('user_id', $userId)
      ->where('language_id', $defaultLangId)
      ->get();

    if ($categories->isEmpty()) {
      return;
    }

    $defs = $this->getCauseDefinitions($count);

    foreach ($defs as $def) {

      $imageName = $this->ai->generateImage(
        $def['image_prompt'],
        800,
        500,
        $this->imagePath
      );

      $goal   = $def['goal_amount'];
      $min    = $def['min_amount'];
      $custom = $def['custom_amount'];

      $donation = Donation::create([
        'user_id'       => $userId,
        'goal_amount'   => $goal,
        'min_amount'    => $min,
        'custom_amount' => $custom,
        'image'         => $imageName,
      ]);


      $prompts = $this->getContentPrompts();

      $rawTitle = $this->ai->generateText($prompts['title_prompt']);
      $title    = $this->cleanLine($rawTitle, 120);

      $slug = make_slug($title);

      $rawContent = $this->ai->generateText($prompts['content_prompt']);
      $content    = $this->cleanText($rawContent, 900);

      $rawMetaKw = $this->ai->generateText($prompts['meta_keywords_prompt']);
      $metaKw    = $this->cleanText($rawMetaKw, 200);

      $rawMetaDs = $this->ai->generateText($prompts['meta_description_prompt']);
      $metaDs    = $this->cleanText($rawMetaDs, 200);

      DonationContent::create([
        'user_id'              => $userId,
        'language_id'          => $defaultLangId,
        'donation_id'          => $donation->id,
        'donation_category_id' => $categories->random()->id,
        'title'                => $title,
        'slug'                 => $slug,
        'content'              => $content,          
        'meta_keywords'        => $metaKw,
        'meta_description'     => $metaDs,
      ]);
    }
  }

  private function getCauseDefinitions(int $count): array
  {

    $base = [
      [
        'goal_amount'   => 5000,
        'min_amount'    => 10,
        'custom_amount' => 10,
        'image_prompt'  => "Photorealistic charity image, sharp focus on children's clear faces with detailed eyes and natural skin texture, South Asian children in bright classroom smiling hopefully, individual unique facial features visible, shot on Canon EOS R5 85mm f/1.8 portrait lens, 8K UHD hyperrealistic, crisp iris details, soft natural daylight, donation banner style, warm hopeful tones",
      ],
      [
        'goal_amount'   => 8000,
        'min_amount'    => 20,
        'custom_amount' => 30,
        'image_prompt'  => "Hyperrealistic medical fundraising hero image, doctor's face ultra sharp with clear eyes and realistic skin pores, helping smiling patient in modern hospital, distinct facial features on both, professional Canon 50mm lens f/1.4 shot, 4K detailed textures, natural hospital lighting, urgent yet positive mood, perfect focus on faces",
      ],
      [
        'goal_amount'   => 3000,
        'min_amount'    => 5,
        'custom_amount' => 80,
        'image_prompt'  => "Realistic food donation banner, volunteers' faces highly detailed with sharp eyes and natural expressions while distributing meals to grateful families, warm skin tones visible, shot with professional DSLR 85mm lens, 8K resolution crisp details, humanitarian charity style, soft golden hour lighting, clear individual facial identities",
      ],
    ];

    return array_slice($base, 0, $count);
  }
  private function getContentPrompts(): array
  {
    $businessName = $this->ai->getBusinessName();
    $baseContext  = "{$businessName} is running a fundraising campaign for people in need.";

    $titleVariations = [
      "urgent and emotional appeal",
      "hopeful and inspiring tone",
      "story-driven and personal",
      "direct and action-oriented",
      "community-focused and warm",
      "crisis response style",
      "long-term impact focused",
      "children and education centered",
      "medical emergency style",
      "hunger and basic needs"
    ];


    $style = $titleVariations[array_rand($titleVariations)];

    $extraKeywords = [
      "children in poverty",
      "life-saving surgery",
      "disaster victims",
      "hungry families",
      "clean water project",
      "orphan education",
      "cancer patients",
      "refugee support",
      "elderly care",
      "animal rescue"
    ];
    $keyword = $extraKeywords[array_rand($extraKeywords)];

    return [
      'title_prompt' => "Generate a UNIQUE and compelling donation cause title in 6-10 words only.
            Style: {$style}
            Focus on: {$keyword}
            Make it different from these previous titles: Help Children Go To School, Provide Medical Treatment, Feed Hungry Families
            Context: {$baseContext}
            
            Rules:
            - ONLY the title
            - No quotes, no numbering, no explanation
            - Must be emotional and clickable
            Example: Save a Child's Dream of Education Today
            
            Output only the title:",


      'content_prompt' => "Write a 140-200 word fundraising story.
            Focus area: {$keyword}
            Tone: {$style}
            Include real emotional story, specific need, exact use of funds, urgency.
            Context: {$baseContext}
            Output plain text only.",

      'meta_keywords_prompt' => "Generate 6-8 SEO keywords including: donation, charity, {$keyword}",
      'meta_description_prompt' => "Write 145-155 char meta description. Include urgency about {$keyword}. Context: {$baseContext}",
    ];
  }

  private function cleanLine(string $text, int $maxLen): string
  {
    $text = preg_replace('/^(Here are|Here is|Sure|Certainly|Options:)/i', '', $text);
    $text = preg_replace('/[*_#`~\[\]<>]/', '', $text);
    $text = preg_replace('/\r?\n.*/s', '', $text);
    $text = preg_replace('/\s+/', ' ', $text);
    $text = trim($text);

    if (strlen($text) > $maxLen) {
      $text = substr($text, 0, $maxLen);
    }

    return $text;
  }

  private function cleanText(string $text, int $maxLen): string
  {
    $text = preg_replace('/^(Here are|Here is|Sure|Certainly|Options:)/i', '', $text);
    $text = preg_replace('/[*_#`~\[\]<>]/', '', $text);
    $text = preg_replace('/\s+/', ' ', $text);
    $text = trim($text);

    if (strlen($text) > $maxLen) {
      $text = substr($text, 0, $maxLen);
    }

    return $text;
  }
}
