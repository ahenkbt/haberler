<?php

namespace App\Exceptions;

use App\Models\Language;
use App\Models\User;
use App\Models\User\BasicSetting;
use App\Models\User\Language as UserLanguage;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Exceptions\Handler as ExceptionHandler;
use Illuminate\Support\Facades\Request;
use Illuminate\Support\Facades\View;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\Routing\Exception\RouteNotFoundException;
use Throwable;

class Handler extends ExceptionHandler
{
    /**
     * A list of the exception types that are not reported.
     *
     * @var array
     */
    protected $dontReport = [];
    /**
     * A list of the inputs that are never flashed for validation exceptions.
     *
     * @var array
     */
    protected $dontFlash = [
        'password',
        'password_confirmation',
    ];
    /**
     * Report or log an exception.
     *
     * @param  \Throwable  $exception
     * @return void
     *
     * @throws \Throwable
     */
    public function report(Throwable $exception)
    {
        parent::report($exception);
    }
    /**
     * Render an exception into an HTTP response.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Throwable  $exception
     * @return \Symfony\Component\HttpFoundation\Response
     *
     * @throws \Throwable
     */
    public function render($request, Throwable $exception)
    {
        //check if exception is an instance of ModelNotFoundException.
        if ($exception instanceof ModelNotFoundException) {
            // normal 404 view page feedback
            // path based user URL


            $route = Request::route();
            $routePrefix = ($route !== null) ? (string) $route->getPrefix() : '';
            if (
                $route !== null
                && str_replace('www.', '', Request::getHost()) == env('WEBSITE_HOST')
                && strpos($routePrefix, '{username}') !== false
            ) {
                $user = User::where('username', Request::route('username'));
                if ($user->count() > 0) {
                    $user = $user->first();
                    $userBs = $user->basic_setting;
                    $keywords = $this->userLocal($user);
                    return response()->view('errors.user-404', ['userBs' => $userBs, 'keywords' => $keywords], 404);
                } else {
                    $this->adminLocal();
                    return response()->view('errors.404', [], 404);
                }
            }
            // custom domain & subdomain based user URL
            elseif (Request::getHost() != env('WEBSITE_HOST')) {
                // if its a subdomain
                if (strpos(Request::getHost(), env('WEBSITE_HOST')) !== false) {
                    // if subdomain based URL, get username & fetch user & user_basic_settings
                    $host = Request::getHost();
                    $host = str_replace("www.", "", $host);
                    $hostArr = explode('.', $host);
                    $username = $hostArr[0];
                    $user = User::where('username', $username);
                    if ($user->count() > 0) {
                        $userBs = $user->first()->basic_setting;
                        $keywords = $this->userLocal($user);
                        return response()->view('errors.user-404', ['userBs' => $userBs, 'keywords' => $keywords], 404);
                    }
                } else {
                    $host = Request::getHost();
                    // Always include 'www.' at the begining of host
                    if (substr($host, 0, 4) == 'www.') {
                        $host = $host;
                    } else {
                        $host = 'www.' . $host;
                    }

                    $user = User::whereHas('user_custom_domains', function ($q) use ($host) {
                        $q->where('status', '=', 1)
                            ->where(function ($query) use ($host) {
                                $query->where('requested_domain', '=', $host)
                                    ->orWhere('requested_domain', '=', str_replace("www.", "", $host));
                            });
                        // fetch the custom domain , if it matches 'with www.' URL or 'without www.' URL
                    });
                    if ($user->count() > 0) {
                        $user = $user->first();
                        $userBs = $user->basic_setting;
                        $keywords = $this->userLocal($user);
                        return response()->view('errors.user-404', ['userBs' => $userBs, 'keywords' => $keywords], 404);
                    } else {
                        $this->adminLocal();
                        return response()->view('errors.404', [], 404);
                    }
                }
            }
            // main website 404 page
            else {
                $this->adminLocal();
                return response()->view('errors.404', [], 404);
            }
        }
        return parent::render($request, $exception);
    }

    private function adminLocal()
    {
        if (session()->has('lang')) {
            app()->setLocale(session()->get('lang'));
        } else {
            $defaultLang = Language::where('is_default', 1)->first();
            if (!empty($defaultLang)) {
                app()->setLocale($defaultLang->code);
            }
        }
    }
    private function userLocal($user)
    {
  
        if (session()->has('user_lang')) {
            $code = session()->get('user_lang');
            $lan = UserLanguage::where([['user_id', $user->id], ['code', $code]])->first();
            return json_decode($lan->keywords, true);
        } else {
            $lan = UserLanguage::where([['user_id', $user->id], ['is_default', 1]])->first();

            return json_decode($lan->keywords, true);
        }
    }
}
