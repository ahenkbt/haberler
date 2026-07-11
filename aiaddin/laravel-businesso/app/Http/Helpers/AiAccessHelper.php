<?php

namespace App\Http\Helpers;

use App\Models\AiGenerationLog;
use App\Models\Package;

class AiAccessHelper
{
  /**
   * Check if package has AI feature
   */
  public static function hasAiFeature(Package $package): bool
  {
    $features = json_decode($package->features ?? '[]', true);

    return is_array($features)
      && in_array('One-Click AI Website Setup', $features);
  }

  /**
   * Count how many times user used AI
   */
  public static function usageCount(int $userId, ?int $packageId = null): int
  {
    return AiGenerationLog::where('user_id', $userId)
      ->when($packageId, fn($q) => $q->where('package_id', $packageId))
      ->count();
  }

  /**
   * Can user generate AI now?
   */
  public static function canGenerate(int $userId, Package $package): array
  {
    // Feature check
    if (!self::hasAiFeature($package)) {
      return [
        'allowed' => false,
        'message' => __('Your current package does not include AI Website Generation') . '.'
      ];
    }

    $limit = (int) ($package->ai_generate_limit ?? 0);

    // unlimited
    if ($limit === 999999) {
      return ['allowed' => true];
    }

    $used = self::usageCount($userId, $package->id);

    if ($used >= $limit) {
      return [
        'allowed' => false,
        'message' => __('You have reached your AI generation limit') . '.'
      ];
    }

    return ['allowed' => true];
  }
}
