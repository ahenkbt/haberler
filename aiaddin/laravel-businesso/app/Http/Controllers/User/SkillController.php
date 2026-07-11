<?php

namespace App\Http\Controllers\User;

use App\Http\Controllers\Controller;
use App\Models\User\Language;
use App\Models\User\Skill;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Session;
use Illuminate\Support\Facades\Validator;

class SkillController extends Controller
{
    /**
     * Display a listing of the resource.
     *
     * @return
     */
    public function index(Request $request)
    {
        $lang = Language::where([['code', $request->language], ['user_id', Auth::id()]])->firstorFail();

        $data['skills'] = Skill::where([
            ['language_id', '=', $lang->id],
            ['user_id', '=', Auth::id()],
        ])
            ->orderBy('id', 'DESC')
            ->get();
        return view('user.skill.index', $data);
    }

    /**
     * Store a newly created resource in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\Response
     */
    public function store(Request $request)
    {

        $slug = make_slug($request->title);
        $rules = [
            'user_language_id' => 'required',
            'title' => 'required|max:255',
            'percentage' => 'required|numeric|digits_between:1,100',
            'color' => 'required|max:20',
            'serial_number' => 'required|integer'
        ];

        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            $errmsgs = $validator->getMessageBag()->add('error', 'true');
            return response()->json($validator->errors());
        }
        $input = $request->all();
        $input['language_id'] = $request->user_language_id;
        $input['slug'] = $slug;
        $input['user_id'] = Auth::id();

        $skill = new Skill;
        $skill->create($input);

        Session::flash('success', __('Skill added successfully') . '!');
        return "success";
    }

    /**
     * Show the form for editing the specified resource.
     *
     * @param  int  $id
     * @return
     */
    public function edit($id)
    {
        $data['skill'] = Skill::where('user_id', Auth::user()->id)->where('id', $id)->firstOrFail();
        return view('user.skill.edit', $data);
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
        $allowedExts = array('jpg', 'png', 'jpeg');
        $slug = make_slug($request->title);

        $rules = [
            'title' => 'required|max:255',
            'percentage' => 'required|numeric|digits_between:1,100',
            'color' => 'required|max:20',
            'serial_number' => 'required|integer'
        ];
        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            $errmsgs = $validator->getMessageBag()->add('error', 'true');
            return response()->json($validator->errors());
        }
        $input = $request->all();
        $skill = Skill::where('user_id', Auth::user()->id)->where('id', $request->skill_id)->firstOrFail();
        $input['slug'] = $slug;
        $input['user_id'] = Auth::id();
        $skill->update($input);
        Session::flash('success', __('Skill updated successfully') . '!');
        return "success";
    }

    public function delete(Request $request)
    {
        $skill = Skill::where('user_id', Auth::user()->id)->where('id', $request->skill_id)->firstOrFail();
        $skill->delete();
        Session::flash('success', __('Skill deleted successfully') . '!');
        return back();
    }
    public function bulkDelete(Request $request)
    {
        $ids = $request->ids;
        foreach ($ids as $id) {
            $skill = Skill::where('user_id', Auth::user()->id)->where('id', $id)->firstOrFail();
            $skill->delete();
        }
        Session::flash('success', __('Skills deleted successfully') . '!');
        return "success";
    }
}
