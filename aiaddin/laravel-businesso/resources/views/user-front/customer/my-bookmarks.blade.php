@extends('user-front.layout')

@section('tab-title')
  {{ $keywords['edit_profile'] ?? __('Edit profile') }}
@endsection

@section('page-name')
  {{ $keywords['edit_profile'] ?? __('Edit profile') }}
@endsection
@section('br-name')
  {{ $keywords['Bookmark_List'] ?? __('Bookmark List') }}
@endsection

@section('content')

  <!-- Start All Bookmarks (Post) Section -->
  <section class="user-dashboard pt-100">
    <div class="container">
      <div class="row">
        @includeIf('user-front.customer.side-navbar')

        <div class="col-lg-9">
          <div class="row">
            <div class="col-lg-12">
              <div class="user-profile-details">
                <div class="account-info">
                  <div class="title mb-3">
                    <h4>{{ $keywords['Bookmark_List'] ?? __('Bookmark List') }}</h4>
                  </div>

                  <div class="main-info">
                    @if (count($bookmarks) == 0)
                      <div class="row text-center">
                        <div class="col">
                          <h4>
                            {{ $keywords['No_Bookmark_Found'] ? $keywords['No_Bookmark_Found'] . '!' : __('No Bookmark Found') . '!' }}
                          </h4>
                        </div>
                      </div>
                    @else
                      <div class="main-table">
                        <div class="table-responsive">
                          <table id="bookmark-table"
                            class="dataTables_wrapper dt-responsive table-striped dt-bootstrap4 w-100">
                            <thead>
                              <tr>
                                <th>#</th>
                                <th>{{ $keywords['Title'] ?? __('Title') }}</th>
                                <th>{{ $keywords['Views'] ?? __('Views') }}</th>
                                <th>{{ $keywords['Date'] ?? __('Date') }}</th>
                                <th>{{ $keywords['Action'] ?? __('Action') }}</th>
                              </tr>
                            </thead>
                            <tbody>
                              @foreach ($bookmarks as $bookmark)
                                <tr>
                                  <td>{{ $loop->iteration }}</td>

                                  @php
                                    $post = $bookmark->post()->where('user_id', $user->id)->first();
                                    $postContent = $post
                                        ->where('language_id', $language->id)
                                        ->where('user_id', $user->id)
                                        ->first();
                                  @endphp

                                  <td>
                                    {{ strlen($postContent->title) > 30 ? mb_substr($postContent->title, 0, 30, 'UTF-8') . '...' : $postContent->title }}
                                  </td>
                                  <td>{{ $post->views }}</td>
                                  <td>{{ date_format($bookmark->created_at, 'M d, Y') }}</td>
                                  <td>
                                    <a href="{{ route('front.user.blog.detail', [getParam(), $postContent->slug, $postContent->id]) }}"
                                      class="btn" target="_blank">{{ $keywords['Details'] ?? __('Details') }}</a>
                                  </td>
                                </tr>
                              @endforeach
                            </tbody>
                          </table>
                        </div>
                      </div>
                    @endif
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
  <!-- End All Bookmarks (Post) Section -->
@endsection
