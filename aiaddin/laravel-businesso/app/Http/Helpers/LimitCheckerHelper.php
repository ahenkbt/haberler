<?php

namespace App\Http\Helpers;

use Carbon\Carbon;
use App\Models\Package;
use App\Models\Membership;
use App\Models\BasicSetting;
use Illuminate\Support\Facades\Config;

class LimitCheckerHelper
{
    public static function vcardLimitchecker(int $user_id)
    {   

        $bs = BasicSetting::first();
        Config::set('app.timezone', $bs->timezone);

        $id = Membership::query()->where([
            ['user_id', '=', $user_id],
            ['expire_date', '>=', Carbon::now()->format('Y-m-d')]
        ])->pluck('package_id')->first();
       $package = Package::query()->findOrFail($id);
        return $package->number_of_vcards;
    }
}
