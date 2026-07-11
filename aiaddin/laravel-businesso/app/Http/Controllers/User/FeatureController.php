<?php

namespace App\Http\Controllers\User;

use App\Constants\Constant;
use Illuminate\Http\Request;
use App\Models\User\Language;
use App\Models\User\UserFeature;
use App\Http\Controllers\Controller;
use App\Http\Helpers\Uploader;
use App\Models\User\BasicSetting;
use App\Rules\ImageMimeTypeRule;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Session;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;


class FeatureController extends Controller
{
    public function index(Request $request)
    {
        $lang = Language::where('code', $request->language)->where('user_id', Auth::guard('web')->user()->id)->firstorFail();
        $lang_id = $lang->id;
        $data['features'] = UserFeature::where('language_id', $lang_id)->where('user_id', Auth::guard('web')->user()->id)->orderBy('id', 'DESC')->get();
        $data['lang_id'] = $lang_id;
        $data['featuredImage'] = BasicSetting::where('user_id', Auth::guard('web')->user()->id)->select('features_section_image')->first();
        return view('user.feature.index', $data);
    }
    public function edit($id)
    {
        $data['feature'] = UserFeature::findOrFail($id);
        return view('user.feature.edit', $data);
    }

    public function store(Request $request)
    {

        $theme = BasicSetting::where('user_id', Auth::guard('web')->user()->id)->select('theme')->first();
        $rules = [
            'user_language_id' => 'required',
            'icon' => [Rule::when($theme->theme != 'home_ten', 'required')],
            'title' => 'required|max:50',
            'text' => 'required|max:255',
            // 'color' => [Rule::when($theme->theme != 'home_ten', 'required')],
            'serial_number' => 'required|integer',
        ];

        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            $errmsgs = $validator->getMessageBag()->add('error', 'true');
            return response()->json($validator->errors());
        }

        if ($request->hasFile('icon')) {
            $file = $request->file('icon');
            $name = time() . $file->getClientOriginalName();
            $file->move(public_path('assets/front/img/user/feature/'), $name);
        }
        
        $feature = new UserFeature;
        $feature->user_id = Auth::guard('web')->user()->id;
        if ($theme->theme != 'home_ten') $feature->icon = $name;
        $feature->language_id = $request->user_language_id;
        $feature->title = $request->title;
        $feature->text = $request->text;
        $feature->color = $request->color;
        $feature->serial_number = $request->serial_number;
        $feature->save();
        Session::flash('success', __('Feature added successfully') . '!');
        return "success";
    }
    public function update(Request $request)
    {
        $request->validate([
            'title' => 'required|max:50',
            'text' => 'required|max:255',
            // 'color' => 'required',
            'serial_number' => 'required|integer',
        ]);

        $feature = UserFeature::findOrFail($request->feature_id);
        if ($request->hasFile('icon')) {
            @unlink(public_path('assets/front/img/user/feature/' . $feature->icon));
            $file = $request->file('icon');
            $name = time() . $file->getClientOriginalName();
            $file->move(public_path('assets/front/img/user/feature/'), $name);
        }


        if ($request->icon) {
            $feature->icon = $name;
        }
        $feature->title = $request->title;
        $feature->text = $request->text;
        $feature->color = $request->color;
        $feature->serial_number = $request->serial_number;
        $feature->save();
        Session::flash('success', __('Feature updated successfully') . '!');
        return back();
    }

    public function imageUpdate(Request $request)
    {
        $data = BasicSetting::where('user_id', Auth::guard('web')->user()->id)->select('features_section_image')->first();
        $rules = [];
        if (!$request->filled('features_section_image') && empty($data->features_section_image)) {
            $rules['features_section_image'] = 'required';
        }
        if ($request->hasFile('features_section_image')) {
            $rules['features_section_image'] = new ImageMimeTypeRule();
        }
        $validator = Validator::make($request->all(), $rules);

        if ($validator->fails()) {
            $validator->getMessageBag()->add('error', 'true');
            return response()->json(['errors' => $validator->errors()]);
        }

        if ($request->hasFile('features_section_image')) {
            $imgName = Uploader::update_picture(Constant::WEBSITE_FEATURE_SECTION_IMAGE, $request->file('features_section_image'), $data->features_section_image);
            // finally, store the image into db
            BasicSetting::query()->updateOrInsert(
                ['user_id' => Auth::guard('web')->user()->id],
                ['features_section_image' => $imgName]
            );
            session()->flash('success', __('Image updated successfully') . '!');
        }
        return "success";
    }

    public function delete(Request $request)
    {
        $feature = UserFeature::findOrFail($request->feature_id);
        @unlink(public_path('assets/front/img/user/feature/' . $feature->icon));
        $feature->delete();
        Session::flash('success', __('Feature deleted successfully') . '!');
        return back();
    }
}
