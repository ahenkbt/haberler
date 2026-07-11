<?php

namespace App\Services\AiWebsite\HomePage;

use App\Models\User\Member;
use App\Services\MasterAiGenerator;

class MemberService
{
  protected $ai;
  protected $imageStoragePath = 'assets/front/img/user/team/';
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

      $oldMembers = Member::where('user_id', $userId)->get();

      foreach ($oldMembers as $member) {
        if ($member->image && file_exists(public_path($this->imageStoragePath . $member->image))) {
          @unlink(public_path($this->imageStoragePath . $member->image)); 
        }
      }

      Member::where('user_id', $userId)->delete();
    }

    $memberData = $this->getMemberData();

    foreach ($memberData as $index => $data) {
      $name = $this->ai->generateText($data['name_prompt']);
      $rank = $this->ai->generateText($data['rank_prompt']);

      // Generate professional team member photo
      $image = $this->ai->generateImage(
        $data['image_prompt'],
        400,
        400,
        $this->imageStoragePath
      );

      Member::create([
        'user_id' => $this->ai->getUserId(),
        'language_id' => $this->ai->getDefaultLanguageId(),
        'name' => $this->extractCleanTitle($name),
        'rank' => $this->extractCleanTitle($rank),
        'image' => $image,
        'facebook' => $data['facebook'],
        'twitter' => $data['twitter'],
        'instagram' => $data['instagram'],
        'linkedin' => $data['linkedin'],
        'featured' => $data['featured'],
      ]);
    }
  }

  private function getMemberData()
  {
    $businessName = $this->ai->getBusinessName();
    $industry = $this->ai->getIndustry();
    $businessInfo = $this->ai->getBusinessInfo();

    $baseContext = "{$businessName} is a leading {$industry} company. {$businessInfo}";

    $qualityEnhancer = ", shot with professional DSLR camera, 85mm portrait lens, hyperrealistic facial details, sharp focus on eyes, natural skin texture with pores, individual unique faces, detailed iris and pupils, realistic human imperfections, studio quality lighting";

    $negativePrompt = ", AVOID: soft blurry faces, plastic skin, airbrushed look, cloned faces, synthetic appearance, uniform features, doll-like skin, low detail eyes";

    return [
      [
        'name_prompt' => "You must return ONLY a realistic full name (2-3 words). No formatting, no explanation.
                Generate a professional name for a CEO/Founder.
                Examples: David Anderson, Sarah Mitchell, Michael Chen, Emma Thompson
                Output: Just the name, nothing else.",

        'rank_prompt' => "You must return ONLY a job title (2-4 words). No formatting, no explanation.
                Generate a CEO/Founder title for {$industry} company.
                Examples: CEO & Founder, Chief Executive Officer, Founder & President
                Output: Just the title, nothing else.
                Context: {$baseContext}",

        'image_prompt' => "Professional corporate headshot of a CEO, confident executive appearance, formal business suit, neutral clean background, high-end professional photography, studio lighting, sharp focus" . $qualityEnhancer . $negativePrompt,

        'facebook' => 'https://facebook.com',
        'twitter' => 'https://twitter.com',
        'instagram' => 'https://instagram.com',
        'linkedin' => 'https://linkedin.com',
        'featured' => 1,
      ],
      [
        'name_prompt' => "You must return ONLY a realistic full name (2-3 words). No formatting, no explanation.
                Generate a professional name for a CTO/Technology lead.
                Output: Just the name, nothing else.",

        'rank_prompt' => "You must return ONLY a job title (2-4 words). No formatting, no explanation.
                Generate a CTO/Technology title for {$industry} company.
                Examples: Chief Technology Officer, CTO, Head of Technology, Technology Director
                Output: Just the title, nothing else.
                Context: {$baseContext}",

        'image_prompt' => "Professional business portrait of a CTO, intelligent and innovative appearance, smart business casual attire, modern office background, professional corporate photography, natural lighting" . $qualityEnhancer . $negativePrompt,

        'facebook' => 'https://facebook.com',
        'twitter' => 'https://twitter.com',
        'instagram' => 'https://instagram.com',
        'linkedin' => 'https://linkedin.com',
        'featured' => 1,
      ],
      [
        'name_prompt' => "You must return ONLY a realistic full name (2-3 words). No formatting, no explanation.
                Generate a professional name for a Marketing Director.
                Output: Just the name, nothing else.",

        'rank_prompt' => "You must return ONLY a job title (2-4 words). No formatting, no explanation.
                Generate a Marketing leadership title for {$industry} company.
                Examples: Marketing Director, Head of Marketing, CMO, Chief Marketing Officer
                Output: Just the title, nothing else.
                Context: {$baseContext}",

        'image_prompt' => "Professional headshot of a marketing director, creative and approachable expression, stylish business attire, clean professional background, corporate portrait photography, soft lighting" . $qualityEnhancer . $negativePrompt,

        'facebook' => 'https://facebook.com',
        'twitter' => 'https://twitter.com',
        'instagram' => 'https://instagram.com',
        'linkedin' => 'https://linkedin.com',
        'featured' => 1,
      ],
      [
        'name_prompt' => "You must return ONLY a realistic full name (2-3 words). No formatting, no explanation.
                Generate a professional name for an Operations Manager.
                Output: Just the name, nothing else.",

        'rank_prompt' => "You must return ONLY a job title (2-4 words). No formatting, no explanation.
                Generate an Operations leadership title for {$industry} company.
                Examples: Operations Manager, Head of Operations, Operations Director, COO
                Output: Just the title, nothing else.
                Context: {$baseContext}",

        'image_prompt' => "Professional business photo of operations manager, competent and organized demeanor, professional business clothing, neutral office background, high quality corporate headshot, professional lighting" . $qualityEnhancer . $negativePrompt,

        'facebook' => 'https://facebook.com',
        'twitter' => 'https://twitter.com',
        'instagram' => 'https://instagram.com',
        'linkedin' => 'https://linkedin.com',
        'featured' => 0,
      ],
      [
        'name_prompt' => "You must return ONLY a realistic full name (2-3 words). No formatting, no explanation.
                Generate a professional name for a Creative Director.
                Output: Just the name, nothing else.",

        'rank_prompt' => "You must return ONLY a job title (2-4 words). No formatting, no explanation.
                Generate a Creative leadership title for {$industry} company.
                Examples: Creative Director, Head of Design, Chief Creative Officer, Design Lead
                Output: Just the title, nothing else.
                Context: {$baseContext}",

        'image_prompt' => "Professional portrait of creative director, artistic and professional appearance, modern casual business style, contemporary office setting, creative industry photography, natural professional lighting" . $qualityEnhancer . $negativePrompt,

        'facebook' => 'https://facebook.com',
        'twitter' => 'https://twitter.com',
        'instagram' => 'https://instagram.com',
        'linkedin' => 'https://linkedin.com',
        'featured' => 0,
      ],
      [
        'name_prompt' => "You must return ONLY a realistic full name (2-3 words). No formatting, no explanation.
                Generate a professional name for a Customer Success Manager.
                Output: Just the name, nothing else.",

        'rank_prompt' => "You must return ONLY a job title (2-4 words). No formatting, no explanation.
                Generate a Customer Success title for {$industry} company.
                Examples: Customer Success Manager, Head of Customer Experience, Client Relations Director
                Output: Just the title, nothing else.
                Context: {$baseContext}",

        'image_prompt' => "Professional headshot of customer success manager, friendly and trustworthy expression, professional business attire, clean background, corporate quality photography, warm professional lighting" . $qualityEnhancer . $negativePrompt,

        'facebook' => 'https://facebook.com',
        'twitter' => 'https://twitter.com',
        'instagram' => 'https://instagram.com',
        'linkedin' => 'https://linkedin.com',
        'featured' => 0,
      ],
    ];
  }

  private function extractCleanTitle($text)
  {
    // Remove common AI response patterns
    $text = preg_replace('/^(Here are|Options:|Choose from:).*/i', '', $text);
    $text = preg_replace('/[*_#`~\[\]]/', '', $text);
    $text = preg_replace('/^[\s\-•]+/', '', $text);
    $text = preg_replace('/\n.*$/s', '', $text);

    return trim($text);
  }
}
