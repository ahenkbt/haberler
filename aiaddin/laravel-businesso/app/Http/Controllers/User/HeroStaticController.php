<?php

namespace App\Http\Controllers\User;

use App\Http\Controllers\Controller;
use App\Http\Helpers\Uploader;
use App\Models\User\BasicSetting;
use App\Models\User\HeroStatic;
use App\Models\User\Language;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;

class HeroStaticController extends Controller
{
    public function staticVersion(Request $request)
    {
        $user = Auth::guard('web')->user();
        if (!$user) {
            return redirect()->back()->with('error', __('User not authenticated. Please log in') . '.');
        }

        $language = Language::where('code', $request->language)
            ->where('user_id', $user->id)->first();

        $information['language'] = $language;

        // then, get the static version info of that language from db
        $information['data'] = HeroStatic::where('language_id', $language->id)->first();

        return view('user.home.hero-section.static-version', $information);
    }

    public function updateStaticInfo(Request $request, $language): RedirectResponse
    {
        
        $user = Auth::guard('web')->user();
        if (!$user) {
            return redirect()->back()->with('error', __('User not authenticated. Please log in') . '.');
        }

        $rules = [
            'title' => 'required',
            'subtitle' => 'sometimes|required',
        ];

        $lang = Language::where('code', $request->language)
            ->where('user_id', $user->id)
            ->firstOrFail();
            
        $data = HeroStatic::where('language_id', $lang->id)->where('user_id', $user->id)->first();
        if (empty($data->img) && !$request->hasFile('img')) {
            $rules['img'] = 'required|mimes:jpeg,jpg,png,svg|max:30000';
        }
        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            return redirect()->back()->withErrors($validator);
        }

        $videoLink = $request->secound_btn_url;
        if (strpos($videoLink, "&") != false) {
            $videoLink = substr($videoLink, 0, strpos($videoLink, "&"));
            $request['secound_btn_url'] = $videoLink;
        }

        if ($data) {
            $imgName  = $data->img;
            $img2Name = $data->img2;
            $img3Name = $data->img3;

            if ($request->hasFile('img')) {
                $imgName = Uploader::update_picture('assets/front/img/hero_static/', $request->file('img'), $data->img);
            }
            if ($request->hasFile('img2')) {
                $img2Name = Uploader::update_picture('assets/front/img/hero_static/', $request->file('img2'), $data->img2);
            }
            if ($request->hasFile('img3')) {
                $img3Name = Uploader::update_picture('assets/front/img/hero_static/', $request->file('img3'), $data->img3);
            }

            $data->update([
                'img' => $imgName,
                'img2' => $img2Name,
                'img3' => $img3Name,
                'title' => $request->title,
                'subtitle' => $request->subtitle,
                'btn_name' => $request->btn_name,
                'btn_url' => $request->btn_url,
                'hero_text' => $request->hero_text,
                'secound_btn_name' => $request->secound_btn_name,
                'secound_btn_url' => $request->secound_btn_url,
                'designation' => $request->designation,
                'lower_subtitle' => $request->lower_subtitle,
                'toper_subtitle' => $request->toper_subtitle,
                'second_title' => $request->second_title,
                'second_subtitle' => $request->second_subtitle,
                'third_title' => $request->third_title,
                'third_subtitle' => $request->third_subtitle,
                'third_btn_name' => $request->third_btn_name,
                'third_btn_url' => $request->third_btn_url,
            ]);
        } else {
            $data = new HeroStatic;
            if ($request->hasFile('img')) {
                $request['image_name'] = Uploader::update_picture('assets/front/img/hero_static/', $request->file('img'), $data->img);
            }
            if ($request->hasFile('img2')) {
                $request['image_name2'] = Uploader::update_picture('assets/front/img/hero_static/', $request->file('img2'), $data->img2);
            }
            if ($request->hasFile('img3')) {
                $request['image_name3'] = Uploader::update_picture('assets/front/img/hero_static/', $request->file('img3'), $data->img3);
            }
            $data->create(
                $request->except('img', 'img2', 'img3', 'user_id', 'language_id') + [
                    'img' => $request->image_name,
                    'img2' => $request->image_name2,
                    'img3' => $request->image_name3,
                    'user_id' => Auth::id(),
                    'language_id' => $lang->id
                ]
            );
        }
        session()->flash('success', __('Static info updated successfully') . '!');
        return redirect()->back();
    }
}
