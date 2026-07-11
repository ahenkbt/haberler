<?php

namespace App\Http\Middleware;

use App\Models\User\Language;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\View;

class UserWebsiteLanguageMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure(\Illuminate\Http\Request): (\Illuminate\Http\Response|\Illuminate\Http\RedirectResponse)  $next
     * @return \Illuminate\Http\Response|\Illuminate\Http\RedirectResponse
     */
    public function handle(Request $request, Closure $next)
    {
        if (session()->has('user_midtrans')) {
            $user = session()->get('user_midtrans');
        } else {
            $user = getUser(); // Make sure this function is available
        }
        
        if (session()->has('user_lang')) {
            $userCurrentLang = Language::where('code', session()->get('user_lang'))
                ->where('user_id', $user->id)
                ->first();

            if (empty($userCurrentLang)) {
                $userCurrentLang = Language::where('is_default', 1)
                    ->where('user_id', $user->id)
                    ->first();
                session()->put('user_lang', $userCurrentLang->code);
            }
        } else {
            $userCurrentLang = Language::where('is_default', 1)
                ->where('user_id', $user->id)
                ->first();
        }

       

        if ($userCurrentLang) {
            app()->setLocale($userCurrentLang->code);
            // $keywords = json_decode($userCurrentLang->keywords, true);
            // View::share('keywords', $keywords);
        }
        return $next($request);
    }
}
