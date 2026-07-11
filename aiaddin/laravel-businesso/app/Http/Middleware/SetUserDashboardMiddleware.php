<?php

namespace App\Http\Middleware;

use App\Models\Language as AdminLanguage;
use App\Models\User\BasicSetting;
use App\Models\User\Language;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cookie;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Session;
use Symfony\Component\HttpFoundation\Response;

class SetUserDashboardMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */

    public function handle(Request $request, Closure $next): Response
    {
        $user = Auth::guard('web')->user();
        
        $langCode = BasicSetting::where('user_id', $user->id)->select('dashboard_language')
            ->first();

        if ($langCode && !empty($langCode->dashboard_language)) {
            $userDashboardLang = AdminLanguage::where('id', $langCode->dashboard_language)
                ->first();
            if (empty($userDashboardLang)) {
                $userDashboardLang = AdminLanguage::where('is_default', 1)
                    ->first();
            }
        } else {
            $userDashboardLang = AdminLanguage::where('is_default', 1)
                ->first();
        }

        // Set sessions and application locale
        Session::put('user_dashboard_lang', 'user_' . $userDashboardLang->code);
        Session::put('currentLangCode', $userDashboardLang->code);
        Session::put('dashboard_direction', $userDashboardLang->rtl);
        app()->setLocale('user_' . $userDashboardLang->code);
        return $next($request);
    }
}
