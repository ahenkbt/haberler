<?php

namespace App\Http\Controllers\User;

use App\Http\Controllers\Controller;
use App\Models\User\Language;
use App\Models\User\PortfolioCategory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Session;
use Validator;

class PortfolioCategoryController extends Controller
{
    /**
     * Display a listing of the resource.
     *
     * @return
     */
    public function index(Request $request)
    {
        $lang = Language::where([['code', $request->language], ['user_id', Auth::id()]])->firstorFail();
        
        $data['categories'] = PortfolioCategory::where([
            ['language_id', '=', $lang->id],
            ['user_id', '=', Auth::id()],
        ])
            ->orderBy('id', 'DESC')
            ->get();
        return view('user.portfolio.bcategory.index', $data);
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

        $rules = [
            'user_language_id' => 'required',
            'name' => 'required|max:255',
            'status' => 'required',
            'serial_number' => 'required|integer',
        ];

        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            $errmsgs = $validator->getMessageBag()->add('error', 'true');
            return response()->json($validator->errors());
        }

        $bcategory = new PortfolioCategory();
        $bcategory->language_id = $request->user_language_id;
        $bcategory->name = $request->name;
        $bcategory->status = $request->status;
        $bcategory->user_id = Auth::id();
        $bcategory->serial_number = $request->serial_number;
        $bcategory->save();

        Session::flash('success', __('Portfolio category added successfully') . '!');
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
        $rules = [
            'name' => 'required|max:255',
            'status' => 'required',
            'serial_number' => 'required|integer',
        ];

        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            $errmsgs = $validator->getMessageBag()->add('error', 'true');
            return response()->json($validator->errors());
        }

        $bcategory = PortfolioCategory::where('user_id', Auth::user()->id)->where('id', $request->bcategory_id)->firstOrFail();
        $bcategory->name = $request->name;
        $bcategory->status = $request->status;
        $bcategory->serial_number = $request->serial_number;
        $bcategory->save();

        Session::flash('success', __('Portfolio category updated successfully') . '!');
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
        $bcategory = PortfolioCategory::where('user_id', Auth::user()->id)->where('id', $request->bcategory_id)->firstOrFail();
        if ($bcategory->portfolios()->count() > 0) {
            Session::flash('warning', __('First, delete all the portfolios under this category!'));
            return back();
        }
        $bcategory->delete();
        Session::flash('success', __('Portfolio category deleted successfully') . '!');
        return back();
    }

    public function bulkDelete(Request $request)
    {
        $ids = $request->ids;

        foreach ($ids as $id) {
            $bcategory = PortfolioCategory::where('user_id', Auth::user()->id)->where('id', $id)->firstOrFail();
            if ($bcategory->portfolios()->count() > 0) {
                Session::flash('warning', __('First, delete all the portfolios under the selected categories!'));
                return "success";
            }
        }

        foreach ($ids as $id) {
            $bcategory = PortfolioCategory::findOrFail($id);
            $bcategory->delete();
        }

        Session::flash('success', __('Portfolio categories deleted successfully') . '!');
        return "success";
    }

    public function makeFeatured(Request $request)
    {
        $bcategory = PortfolioCategory::where('user_id', Auth::user()->id)->where('id', $request->id)->firstOrFail();
        if ($bcategory) {
            $bcategory->is_featured = $request->status;
            $bcategory->save();
        }
        if ($request->status == 1) {
            $action = __('Featured');
        } else {
            $action = __('Unfeatured');
        }
        Session::flash('success', __('Portfolio category') . ' ' . $action . ' ' . __('successfully') . '!');
        return redirect()->back();
    }
}
