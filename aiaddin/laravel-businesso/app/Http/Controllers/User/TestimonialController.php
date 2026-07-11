<?php

namespace App\Http\Controllers\User;

use App\Http\Controllers\Controller;
use App\Models\User\BasicSetting;
use App\Models\User\Language;
use App\Models\User\UserTestimonial;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Session;
use Purifier;
use Validator;

class TestimonialController extends Controller
{
    /**
     * Display a listing of the resource.
     *
     * @return
     */
    public function index(Request $request)
    {
        $lang = Language::where([['code', $request->language], ['user_id', Auth::id()]])->firstorFail();
        
        $data['testimonials'] = UserTestimonial::where([
            ['lang_id', '=', $lang->id],
            ['user_id', '=', Auth::id()],
        ])
            ->orderBy('id', 'DESC')
            ->get();
        return view('user.testimonial.index', $data);
    }

    /**
     * Store a newly created resource in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return
     */
    public function store(Request $request)
    {
        $img = $request->file('image');
        $allowedExts = array('jpg', 'png', 'jpeg');
        $userBs = BasicSetting::where('user_id', Auth::id())->select('theme')->first();
        $rules = [
            'name' => 'required|max:255',
            'user_language_id' => 'required',
            'content' => 'required',
            'serial_number' => 'required|integer',
        ];
        if ($userBs->theme != 'home_nine') {
            $rules += [
                'image' => 'required|mimes:jpg,jpeg,png'
            ];
        } else {
            $rules += [
                'image' => 'nullable'
            ];
        }
        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            $errmsgs = $validator->getMessageBag()->add('error', 'true');
            return response()->json($validator->errors());
        }
        $input = $request->all();
        $input['user_id'] = Auth::id();

        if ($request->hasFile('image')) {
            $filename = time() . '.' . $img->getClientOriginalExtension();
            $directory = public_path('assets/front/img/user/testimonials/');
            if (!file_exists($directory)) mkdir($directory, 0775, true);
            $request->file('image')->move($directory, $filename);
            $input['image'] = $filename;
        }
        $input['content'] = Purifier::clean($request->content);
        $input['lang_id'] = $request->user_language_id;
        $blog = new UserTestimonial();
        $blog->create($input);

        Session::flash('success', __('Testimonial added successfully') . '!');
        return "success";
    }

    /**
     * Display the specified resource.
     *
     * @param  int  $id
     * @return \Illuminate\Http\Response
     */
    public function show($id)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     *
     * @param  int  $id
     * @return
     */
    public function edit($id)
    {
        $data['testimonial'] = UserTestimonial::where('user_id', Auth::user()->id)->where('id', $id)->firstOrFail();
        return view('user.testimonial.edit', $data);
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
        $img = $request->file('image');
        $allowedExts = array('jpg', 'png', 'jpeg');
        $rules = [
            'name' => 'required|max:255',
            'content' => 'required',
            'serial_number' => 'required|integer',
        ];
        $userBs = BasicSetting::where('user_id', Auth::id())->select('theme')->first();
        $service = UserTestimonial::where('user_id', Auth::user()->id)->where('id', $request->id)->firstOrFail();
        if ($userBs->theme != 'home_nine' && $img) {
            $rules += [
                'image' => 'required|mimes:jpg,jpeg,png'
            ];
        }


        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            $errmsgs = $validator->getMessageBag()->add('error', 'true');
            return response()->json($validator->errors());
        }
        $input = $request->all();
        $input['user_id'] = Auth::id();

        if ($request->hasFile('image')) {
            $filename = time() . '.' . $img->getClientOriginalExtension();
            $directory = public_path('assets/front/img/user/testimonials/');
            $request->file('image')->move($directory, $filename);
            if (file_exists($directory . $service->image)) {
                @unlink($directory . $service->image);
            }
            $input['image'] = $filename;
        }
        $input['content'] = Purifier::clean($request->content);
        $service->update($input);
        Session::flash('success', __('Testimonial updated successfully') . '!');
        return "success";
    }

    /**
     * Remove the specified resource from storage.
     *
     * @param  int  $id
     * @return \Illuminate\Http\Response
     */
    public function delete(Request $request)
    {
        $service = UserTestimonial::where('user_id', Auth::user()->id)->where('id', $request->id)->firstOrFail();
        if (file_exists(public_path('assets/front/img/user/testimonials/' . $service->image))) {
            @unlink(public_path('assets/front/img/user/testimonials/' . $service->image));
        }
        $service->delete();
        Session::flash('success', __('Testimonial deleted successfully') . '!');
        return back();
    }

    public function bulkDelete(Request $request)
    {
        $ids = $request->ids;
        foreach ($ids as $id) {
            $service = UserTestimonial::where('user_id', Auth::user()->id)->where('id', $id)->firstOrFail();
            if (file_exists(public_path('assets/front/img/user/testimonials/' . $service->image))) {
                @unlink(public_path('assets/front/img/user/testimonials/' . $service->image));
            }
            $service->delete();
        }
        Session::flash('success', __('Testimonial deleted successfully') . '!');
        return "success";
    }
}
