<?php

namespace App\Http\Helpers;

use Carbon\Carbon;
use App\Models\User\UserItem;
use App\Models\User\BasicSetting;
use Illuminate\Support\Facades\Auth;
use App\Models\User\UserItemVariation;
use Illuminate\Support\Facades\Config;

class CheckFlashItem
{
    public static function isFlashItem(int $itemId)
    {
        if (Auth::guard('web')->user()) {
            $user  = Auth::guard('web')->user();
        } else {
            $user  = getUser();
        }
        $item = UserItem::findOrFail($itemId);
        $timezone =  BasicSetting::where('user_id', $user->id)->with('timezoneinfo')->first();
        $timezone =  $timezone->timezoneinfo->timezone;

        Config::set('app.timezone', $timezone);
        if (($item->start_date_time <= Carbon::now()->tz($timezone)->format('Y-m-d H:i:s A')) && ($item->end_date_time >= Carbon::now()->tz($timezone)->format('Y-m-d H:i:s A'))) {
            return 1;
        } else {
            return 0;
        }
        // if (Carbon::parse($item->start_date) <= Carbon::now()->format('Y-m-d') &&  Carbon::parse($item->end_date) >= Carbon::now()->format('Y-m-d')) {
        //     $now = Carbon::now()->tz($timezone)->format('g:i A');
        //     $endtime = Carbon::parse($item->end_date . ' ' . $item->end_time)->format('g:i A');
        //     if ($now < $endtime) {
        //         return 1;
        //     } else {
        //         return 0;
        //     }
        // } else {
        //     return 0;
        // }
    }

    public static function checkstock(int $itemstock, $variations)
    {
        if (count($variations) == 0) {
            if ($itemstock > 0) {
                $stock = true;
            } else {
                $stock = false;
            }
            $variations = null;
        } else {
            $stock = true;
            $tstock = '';
            if (count($variations)) {
                foreach ($variations as $varkey => $varvalue) {
                    $tstock = array_sum(json_decode($varvalue->option_stock));
                    if ($tstock == 0) {
                        $stock = false;
                    }
                }
            } else {
                $stock = true;
            }
        }
        return $stock;
    }
}
