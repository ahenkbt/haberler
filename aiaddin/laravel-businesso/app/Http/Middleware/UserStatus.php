<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Session;

class UserStatus
{
    /**
     * Handle an incoming request.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure  $next
     * @return mixed
     */
    public function handle($request, Closure $next)
    {

        if (Auth::guard('web')->check() && !Auth::guard('admin')->check()) {
            if (Auth::guard('web')->user()->status != 1) {
                Auth::guard('web')->logout();
                Session::flash('error', 'Your account has been banned!');
                return redirect(route('front.index'));
            }
        }
        return $next($request);
    }
}
