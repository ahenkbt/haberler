@extends('user.layout')

@section('content')
    <div class="page-header">
        <h4 class="page-title">{{ __("Social_Links") }}</h4>
        <ul class="breadcrumbs">
            <li class="nav-home">
                <a href="{{ route('user-dashboard') . '?language=' . request('language') }}">
                    <i class="flaticon-home"></i>
                </a>
            </li>
            <li class="separator">
                <i class="flaticon-right-arrow"></i>
            </li>
            <li class="nav-item">
                <a href="#">{{ __("Instructors")  }}</a>
            </li>
            <li class="separator">
                <i class="flaticon-right-arrow"></i>
            </li>
            <li class="nav-item">
                <a href="#">{{ $instructor->name }}</a>
            </li>
            <li class="separator">
                <i class="flaticon-right-arrow"></i>
            </li>
            <li class="nav-item">
                <a href="#">{{  __("Social_Links")  }}</a>
            </li>
        </ul>
    </div>

    <div class="row">
        <div class="col-md-12">
            <div class="card">
                <form id="ajaxForm" action="{{ route('user.instructor.store_social_link', ['id' => $instructor->id]) }}"
                    method="post">
                    @csrf
                    <div class="card-header">
                        <div class="card-title d-inline-block">
                            {{ __("Add_Social_Link")  }}
                        </div>
                        <a class="btn btn-info btn-sm float-right d-inline-block"
                            href="{{ route('user.instructors', ['language' => request('language')]) }}">
                            <span class="btn-label">
                                <i class="fas fa-backward"></i>
                            </span>
                            {{ __("Back")  }}
                        </a>
                    </div>

                    <div class="card-body">
                        <div class="row">
                            <div class="col-lg-6 offset-lg-3">
                                <div class="form-group">
                                    <label for="">{{  __("Social_Icon") . ' * ' }}</label>
                                    <div class="btn-group d-block">
                                        <button type="button" class="btn btn-primary iconpicker-component">
                                            <i class="fa fa-fw fa-heart"></i>
                                        </button>
                                        <button type="button" class="icp icp-dd btn btn-primary dropdown-toggle"
                                            data-selected="fa-car" data-toggle="dropdown"></button>
                                        <div class="dropdown-menu"></div>
                                    </div>
                                    <input type="hidden" id="inputIcon" name="icon">
                                    <p class="mt-2 mb-0 text-danger" id="erricon"></p>
                                    <div class="text-warning mt-2">
                                        <small>{{  __("Click_on_the_dropdown_icon_to_select_a_social_link_icon")  }}</small>
                                    </div>
                                </div>

                                <div class="form-group">
                                    <label for="">{{ __("URL")  . '*' }}</label>
                                    <input type="text" class="form-control" name="url"
                                        placeholder="{{ __("Enter_URL_of_Social_Media_Account") }}">
                                    <p class="mt-2 mb-0 text-danger" id="errurl"></p>
                                </div>

                                <div class="form-group">
                                    <label for="">{{  __("Serial_Number") . '*' }}</label>
                                    <input type="number" class="form-control" name="serial_number"
                                        placeholder="{{__("Enter_Serial_Number") }}">
                                    <p class="mt-2 mb-0 text-danger" id="errserial_number"></p>
                                    <p class="text-warning mt-2">
                                        <small>{{  __("Social_link_Serial_Number_text") }}</small>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="card-footer pt-3">
                        <div class="row">
                            <div class="col-12 text-center">
                                <button type="submit" class="btn btn-success" id="submitBtn">
                                    {{ __("Submit")  }}
                                </button>
                            </div>
                        </div>
                    </div>
                </form>
            </div>

            <div class="card">
                <div class="card-header">
                    <div class="card-title">{{  __("Social_Links")  }}</div>
                </div>

                <div class="card-body">
                    <div class="row">
                        <div class="col-lg-12">
                            @if (count($socialLinks) == 0)
                                <h2 class="text-center">
                                    {{ __("NO_SOCIAL_LINK_FOUND") }}</h2>
                            @else
                                <div class="table-responsive">
                                    <table class="table table-striped mt-3" id="basic-datatables">
                                        <thead>
                                            <tr>
                                                <th scope="col">{{ '#' }}</th>
                                                <th scope="col">{{ __("Icon")  }}</th>
                                                <th scope="col">{{ __("URL")  }}</th>
                                                <th scope="col">{{ __("Serial_Number") }}
                                                </th>
                                                <th scope="col">{{ __("Actions")  }}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            @foreach ($socialLinks as $socialLink)
                                                <tr>
                                                    <td>{{ $loop->iteration }}</td>
                                                    <td><i class="{{ $socialLink->icon }}"></i></td>
                                                    <td>{{ $socialLink->url }}</td>
                                                    <td>{{ $socialLink->serial_number }}</td>
                                                    <td>
                                                        <a class="btn btn-secondary btn-sm mr-1"
                                                            href="{{ route('user.instructor.edit_social_link', ['instructor_id' => $socialLink->instructor_id, 'id' => $socialLink->id, 'language' => request('language')]) }}">
                                                            <span class="btn-label">
                                                                <i class="fas fa-edit"></i>
                                                            </span>
                                                            {{ __("Edit")  }}
                                                        </a>

                                                        <form class="d-inline-block deleteform"
                                                            action="{{ route('user.instructor.delete_social_link', ['id' => $socialLink->id]) }}"
                                                            method="post">

                                                            @csrf
                                                            <button type="submit" class="btn btn-danger btn-sm deletebtn">
                                                                <span class="btn-label">
                                                                    <i class="fas fa-trash"></i>
                                                                </span>
                                                                {{ __("Delete")  }}
                                                            </button>
                                                        </form>
                                                    </td>
                                                </tr>
                                            @endforeach
                                        </tbody>
                                    </table>
                                </div>
                            @endif
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
@endsection
