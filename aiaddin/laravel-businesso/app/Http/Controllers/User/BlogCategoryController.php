<?php

namespace App\Http\Controllers\User;

use Illuminate\Http\Request;
use App\Models\User\Language;
use App\Models\User\BlogCategory;
use App\Http\Controllers\Controller;
use App\Models\User\BasicSetting;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Session;
use Illuminate\Support\Facades\Validator;

class BlogCategoryController extends Controller
{
    /**
     * Display a listing of the resource.
     *
     * @return
     */
    public function index(Request $request)
    {
        $lang = Language::where([['code', $request->language], ['user_id', Auth::id()]])->firstorFail();
        
        $data['bcategorys'] = BlogCategory::where([
            ['language_id', '=', $lang->id],
            ['user_id', '=', Auth::guard('web')->user()->id],
        ])
            ->orderBy('id', 'DESC')
            ->get();
        return view('user.blog.bcategory.index', $data);
    }

    /**
     * Show the form for creating a new resource.
     *
     * @return \Illuminate\Http\Response
     */
    public function create()
    {
        //
    }

    /**
     * Store a newly created resource in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\Response
     */
    public function store(Request $request)
    {
        $theme = BasicSetting::where('user_id', Auth::id())->first()->theme;
        $img = $request->file('image');

        $rules = [
            'user_language_id' => 'required',
            'name' => 'required|max:255',
            'status' => 'required',
            'serial_number' => 'required|integer',
        ];

        if ($theme == 'home_thirteen') {
            $imgURL = $request->image;
            $allowedExtensions = array('jpg', 'jpeg', 'png', 'svg');
            $imgExt = $imgURL ? $imgURL->extension() : null;

            $rules['image'] = [
                'required',
                function ($attribute, $value, $fail) use ($allowedExtensions, $imgExt) {
                    if (!in_array($imgExt, $allowedExtensions)) {
                        $fail('Only .jpg, .jpeg, .png and .svg file is allowed.');
                    }
                }
            ];
        }
        if ($theme == 'home_thirteen') {
            $message['image.required'] = ['The image field is required.'];
        }

        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            $errmsgs = $validator->getMessageBag()->add('error', 'true');
            return response()->json($validator->errors());
        }

        if ($request->hasFile('image')) {
            $filename = time() . '.' . $img->getClientOriginalExtension();
            $directory = public_path('assets/front/img/user/blogs/categories/');
            if (!file_exists($directory)) mkdir($directory, 0775, true);
            $request->file('image')->move($directory, $filename);
            $input['image'] = $filename;
        } else {
            $filename = null;
        }

        $bcategory = new BlogCategory();
        $bcategory->language_id = $request->user_language_id;
        $bcategory->name = $request->name;
        $bcategory->status = $request->status;
        $bcategory->user_id = Auth::guard('web')->user()->id;
        $bcategory->serial_number = $request->serial_number;
        $bcategory->image = $filename;
        $bcategory->save();

        Session::flash('success', __('Category added successfully') . '!');
        return "success";
    }

    /**
     * Display the specified resource.
     *
     * @param  int  $id
     * @return \Illuminate\Http\Response
     */

    public function updateFeatured(Request $request, $id)
    {
        $category = BlogCategory::findOrFail($id);
        if ($request->is_featured == 1) {
            $category->update(['is_featured' => 1]);
            Session::flash('success', __('Category featured successfully') . '!');
        } else {
            $category->update(['is_featured' => 0]);
            Session::flash('success', __('Category unfeatured successfully') . '!');
        }

        return redirect()->back();
    }
    public function show($id)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     *
     * @param  int  $id
     * @return \Illuminate\Http\Response
     */
    public function edit($id)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  int  $id
     * @return \Illuminate\Http\Response
     */

    public function update(Request $request)
    {
        $userId = Auth::id();

        // safe get theme
        $basicSetting = BasicSetting::where('user_id', $userId)->first();
        $theme = $basicSetting ? $basicSetting->theme : null;

        $bcategory = BlogCategory::where('user_id', $userId)
            ->where('id', $request->bcategory_id)
            ->firstOrFail();

        // base rules
        $rules = [
            'name' => 'required|string|max:255',
            'status' => 'required',
            'serial_number' => 'required|integer',
        ];

        // if category has no image yet, require an image input
        if ($bcategory->image == null) {
            $rules['image'] = 'required|image|mimes:jpg,jpeg,png,svg|max:2048';
        }

        // theme-specific: allow image but validate mime types
        if ($theme === 'home_thirteen') {
            // if image present, validate; if not present it's optional (we'll keep old image)
            if ($request->hasFile('image')) {
                $rules['image'] = 'image|mimes:jpg,jpeg,png,svg|max:2048';
            }
        }

        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            $validator->getMessageBag()->add('error', 'true');
            return response()->json($validator->errors(), 422);
        }

        // start with existing image name — so we don't accidentally clear it
        $imgName = $bcategory->image;

        if ($theme === 'home_thirteen' && $request->hasFile('image')) {
            $image = $request->file('image');

            // prepare new filename
            $imgExt = $image->getClientOriginalExtension();
            $imgName = time() . '_' . uniqid() . '.' . $imgExt;

            $imgDir = public_path('assets/front/img/user/blogs/categories/');

            // ensure directory exists
            if (!file_exists($imgDir)) {
                @mkdir($imgDir, 0755, true);
            }

            // delete old file if exists
            if ($bcategory->image && file_exists($imgDir . $bcategory->image)) {
                @unlink($imgDir . $bcategory->image);
            }

            // move uploaded file to destination
            try {
                $image->move($imgDir, $imgName);
            } catch (\Exception $e) {
                // log and return error
                Log::error('Image move failed: ' . $e->getMessage());
                return response()->json(['error' => 'Failed to upload image.'], 500);
            }
        }

        // save fields
        $bcategory->name = $request->name;
        $bcategory->status = $request->status;
        $bcategory->serial_number = $request->serial_number;
        $bcategory->image = $imgName;
        $bcategory->save();

        Session::flash('success', __('Category Update successfully') . '!');

        // if this is used by AJAX, better to return JSON; adjust if non-AJAX flow expected
        return "success";
    }

    /**
     * Remove the specified resource from storage.
     *
     * @param  int  $id
     * @return \Illuminate\Http\Response
     */
    public function destroy($id)
    {
        //
    }

    public function delete(Request $request)
    {
        $bcategory = BlogCategory::where('user_id', Auth::guard('web')->user()->id)->where('id', $request->bcategory_id)->firstOrFail();
        if ($bcategory->blogs()->count() > 0) {
            Session::flash('warning', __('First, delete all the blogs under this category') . '!');
            return back();
        }
        @unlink(public_path('assets/front/img/user/blogs/categories/' . $bcategory->image));
        $bcategory->delete();
        Session::flash('success', __('Blog category deleted successfully') . '!');
        return back();
    }

    public function bulkDelete(Request $request)
    {
        $ids = $request->ids;
        foreach ($ids as $id) {
            $bcategory = BlogCategory::where('user_id', Auth::guard('web')->user()->id)->where('id', $id)->firstOrFail();
            if ($bcategory->blogs()->count() > 0) {
                Session::flash('warning', __('First, delete all the blogs under the selected categories') . '!');
                return "success";
            }
        }
        foreach ($ids as $id) {
            $bcategory = BlogCategory::findOrFail($id);
            @unlink(public_path('assets/front/img/user/blogs/categories/' . $bcategory->image));
            $bcategory->delete();
        }
        Session::flash('success', __('Blog categories deleted successfully') . '!');
        return "success";
    }
}
