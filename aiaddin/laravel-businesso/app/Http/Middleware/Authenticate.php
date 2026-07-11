<?php

namespace App\Http\Middleware;

use Illuminate\Auth\Middleware\Authenticate as Middleware;
use Illuminate\Support\Facades\Request;

class Authenticate extends Middleware
{
    /**
     * Get the path the user should be redirected to when they are not authenticated.
     *
     * @param \Illuminate\Http\Request $request
     * @return string|null
     */
    protected function redirectTo($request)
    {
        $host = str_replace('www.', '', Request::getHost());
        $mainHost = str_replace('www.', '', env('WEBSITE_HOST'));

        $segments = Request::segments();
        $firstSegment = $segments[0] ?? null;

        if (!$request->expectsJson()) {

            // ✅ Admin panel
            if (Request::is('admin') || Request::is('admin/*')) {
                return route('admin.login');
            }

            // ✅ Customer panel (username-based)
            if ($host === $mainHost && $firstSegment !== null && $firstSegment !== 'user' && $firstSegment !== 'customer') {
                return route('customer.login', getParam());
            }

            // ✅ General user panel
            return route('user.login');
        }

        return null;
    }
}
