<?php

namespace App\View\Composers;

use App\Models\Language;
use App\Models\Menu;
use Illuminate\View\View;

class FrontLayoutComposer
{
    public function compose(View $view): void
    {
        if (session()->has('lang')) {
            $currentLang = Language::where('code', session()->get('lang'))->first();
        } else {
            $currentLang = Language::where('is_default', 1)->first();
        }

        if (!$currentLang) {
            $view->with([
                'currentLang' => null,
                'bs' => null,
                'be' => null,
                'rtl' => 0,
                'menus' => '[]',
            ]);

            return;
        }

        $menu = Menu::where('language_id', $currentLang->id)->first();

        $view->with([
            'currentLang' => $currentLang,
            'bs' => $currentLang->basic_setting,
            'be' => $currentLang->basic_extended,
            'rtl' => (int) ($currentLang->rtl ?? 0),
            'menus' => $menu?->menus ?? '[]',
        ]);
    }
}
