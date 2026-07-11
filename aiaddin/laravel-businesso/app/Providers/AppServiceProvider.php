<?php

namespace App\Providers;

use App\View\Composers\FrontLayoutComposer;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Support\Facades\View;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     *
     * @return void
     */
    public function register()
    {
        //
    }

    /**
     * Bootstrap any application services.
     *
     * @return void
     */
    public function boot()
    {
        if (app()->runningInConsole()) {
            return;
        }

        $path = request()->path();
        $onInstall = $path === 'install' || str_starts_with($path, 'install/');
        $onHealth = $path === 'healthz';

        if (!file_exists(base_path('storage/installed')) && !$onInstall && !$onHealth) {
            // header()+exit() php artisan serve sürecini öldürüyordu (Railway healthcheck).
            throw new HttpResponseException(redirect('/install/'));
        }

        View::composer(
            ['front.layout', 'front.success', 'front.trial-success'],
            FrontLayoutComposer::class
        );
    }
}
