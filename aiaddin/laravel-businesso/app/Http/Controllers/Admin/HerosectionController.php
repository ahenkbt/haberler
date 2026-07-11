<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\BasicExtended;
use App\Models\Language;
use Validator;
use Session;

class HerosectionController extends Controller
{
    public function imgtext(Request $request)
    {
        $lang = Language::where('code', $request->language)->firstOrFail();
        $data['lang_id'] = $lang->id;
        $data['abe'] = $lang->basic_extended;

        return view('admin.home.hero.img-text', $data);
    }

    public function update(Request $request, $langid)
    {
        $sideImg = $request->file('image');
        $allowedExts = array('jpg', 'png', 'jpeg');

        $rules = [
            'image' => [
                function ($attribute, $value, $fail) use ($request, $sideImg, $allowedExts) {
                    if ($request->hasFile('image')) {
                        $ext = $sideImg->getClientOriginalExtension();
                        if (!in_array($ext, $allowedExts)) {
                            return $fail("Only png, jpg, jpeg image is allowed");
                        }
                    }
                },
            ],
            'hero_img2' => [
                function ($attribute, $value, $fail) use ($request, $sideImg, $allowedExts) {
                    if ($request->hasFile('hero_img2')) {
                        $ext = $request->file('hero_img2')->getClientOriginalExtension();
                        if (!in_array($ext, $allowedExts)) {
                            return $fail("Only png, jpg, jpeg image is allowed");
                        }
                    }
                },
            ],
            'hero_img3' => [
                function ($attribute, $value, $fail) use ($request, $sideImg, $allowedExts) {
                    if ($request->hasFile('hero_img3')) {
                        $ext = $request->file('hero_img3')->getClientOriginalExtension();
                        if (!in_array($ext, $allowedExts)) {
                            return $fail("Only png, jpg, jpeg image is allowed");
                        }
                    }
                },
            ],
            'hero_img4' => [
                function ($attribute, $value, $fail) use ($request, $sideImg, $allowedExts) {
                    if ($request->hasFile('hero_img4')) {
                        $ext = $request->file('hero_img4')->getClientOriginalExtension();
                        if (!in_array($ext, $allowedExts)) {
                            return $fail("Only png, jpg, jpeg image is allowed");
                        }
                    }
                },
            ],
            'hero_img5' => [
                function ($attribute, $value, $fail) use ($request, $sideImg, $allowedExts) {
                    if ($request->hasFile('hero_img5')) {
                        $ext = $request->file('hero_img5')->getClientOriginalExtension();
                        if (!in_array($ext, $allowedExts)) {
                            return $fail("Only png, jpg, jpeg image is allowed");
                        }
                    }
                },
            ],
            'hero_section_title' => 'nullable|max:255',
            'hero_section_text' => 'nullable|max:255',
            'hero_section_button_text' => 'nullable|max:30',
            'hero_section_button_url' => 'nullable',
            'hero_section_subtitle' => 'string|nullable',
            'hero_section_secound_button_text' => 'string|nullable',
            'hero_section_secound_button_url' => 'string|nullable'
            // 'hero_section_video_url' => 'nullable',
        ];

        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            $validator->getMessageBag()->add('error', 'true');
            return response()->json($validator->errors());
        }

        $be = BasicExtended::where('language_id', $langid)->firstOrFail();
        $be->hero_section_title = $request->hero_section_title;
        $be->hero_section_subtitle = $request->hero_section_subtitle;
        $be->hero_section_text = $request->hero_section_text;
        $be->hero_section_button_text = $request->hero_section_button_text;
        $be->hero_section_button_url = $request->hero_section_button_url;
        $be->hero_section_secound_button_text = $request->hero_section_secound_button_text;
        $be->hero_section_secound_button_url = $request->hero_section_secound_button_url;
        // $be->hero_section_video_url = $request->hero_section_video_url;

        if ($request->hasFile('image')) {
            @unlink(public_path('assets/front/img/' . $be->hero_img));
            $filename = uniqid() . '.' . $sideImg->getClientOriginalExtension();
            $sideImg->move(public_path('assets/front/img/'), $filename);
            $be->hero_img = $filename;
        }


        if ($request->hasFile('hero_img2')) {
            @unlink(public_path('assets/front/img/' . $be->hero_img2));
            $filename = uniqid() . '.' . $request->file('hero_img2')->getClientOriginalExtension();
            $request->file('hero_img2')->move(public_path('assets/front/img/'), $filename);
            $be->hero_img2 = $filename;
        }

        if ($request->hasFile('hero_img3')) {
            @unlink(public_path('assets/front/img/' . $be->hero_img3));
            $filename = uniqid() . '.' . $request->file('hero_img3')->getClientOriginalExtension();
            $request->file('hero_img3')->move(public_path('assets/front/img/'), $filename);
            $be->hero_img3 = $filename;
        }

        if ($request->hasFile('hero_img4')) {
            @unlink(public_path('assets/front/img/' . $be->hero_img4));
            $filename = uniqid() . '.' . $request->file('hero_img4')->getClientOriginalExtension();
            $request->file('hero_img4')->move(public_path('assets/front/img/'), $filename);
            $be->hero_img4 = $filename;
        }

        if ($request->hasFile('hero_img5')) {
            @unlink(public_path('assets/front/img/' . $be->hero_img5));
            $filename = uniqid() . '.' . $request->file('hero_img5')->getClientOriginalExtension();
            $request->file('hero_img5')->move(public_path('assets/front/img/'), $filename);
            $be->hero_img5 = $filename;
        }


        $be->save();

        Session::flash('success', __('Hero Section updated successfully!'));
        return "success";
    }

    public function video(Request $request)
    {
        $data['abe'] = BasicExtended::first();

        return view('admin.home.hero.video', $data);
    }

    public function videoupdate(Request $request)
    {
        $rules = [
            'video_link' => 'required|max:255',
        ];

        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            $errmsgs = $validator->getMessageBag()->add('error', 'true');
            return response()->json($validator->errors());
        }
        $bes = BasicExtended::all();

        $videoLink = $request->video_link;
        if (strpos($videoLink, "&") != false) {
            $videoLink = substr($videoLink, 0, strpos($videoLink, "&"));
        }

        foreach ($bes as $key => $be) {
            # code...
            $be->hero_section_video_link = $videoLink;
            $be->save();
        }

        Session::flash('success', __('Informations updated successfully!'));
        return "success";
    }
}
