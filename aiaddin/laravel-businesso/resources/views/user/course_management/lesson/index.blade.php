<div class="modal fade" id="viewLessonModal-{{ $module->id }}" tabindex="-1" role="dialog"
    aria-labelledby="exampleModalCenterTitle" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered modal-lg" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="exampleModalLongTitle">
                    {{ __('Lessons_of') }} {{ $module->title }} ({{ $language->name . ' ' . __('Language') }})
                </h5>
                <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                    <span aria-hidden="true">&times;</span>
                </button>
            </div>

            @php
                $lessons = $module->lesson()->orderBy('serial_number', 'ASC')->get();
            @endphp

            <div class="modal-body">
                @if (count($lessons) == 0)
                    <h3 class="text-center">{{ __('No_Lesson_Found') }}</h3>
                @else
                    <table class="table table-striped">
                        <tr>
                            <th>{{ __('Title') }}</th>
                            <th>{{ __('Status') }}</th>
                            <td>{{ __('Serial_Number') }}</td>
                            <td>{{ __('Actions') }}</td>
                        </tr>
                        <tbody>
                            @foreach ($lessons as $lesson)
                                <tr>
                                    <td width="20%">{{ $lesson->title }}</td>
                                    <td>
                                        @if ($lesson->status == 'draft')
                                            <span class="badge badge-warning">{{__( ucfirst($lesson->status)) }}</span>
                                        @else
                                            <span class="badge badge-primary">{{ __(ucfirst($lesson->status)) }}</span>
                                        @endif
                                    </td>
                                    <td>
                                        {{ $lesson->serial_number }}
                                    </td>
                                    <td>

                                        <a href="#" class="btn btn-sm btn-secondary mr-1 lessonEditBtn"
                                            data-id="{{ $lesson->id }}" data-title="{{ $lesson->title }}"
                                            data-status="{{ $lesson->status }}"
                                            data-serial_number="{{ $lesson->serial_number }}"
                                            data-module_id="{{ $lesson->module_id }}">
                                            <span class="btn-label">
                                                <i class="fas fa-edit"></i>
                                            </span>
                                            {{ __('Edit') }}
                                        </a>

                                        <a href="{{ route('user.course_management.lesson.contents', ['id' => $lesson->id, 'course' => request()->route('id'), 'language' => request('language')]) }}"
                                            class="btn btn-sm btn-info mr-1">
                                            <span class="btn-label">
                                                <i class="fas fa-info-circle"></i>
                                            </span>
                                            {{ __('Contents') }}
                                        </a>

                                        <form class="lessonDeleteForm d-inline-block"
                                            action="{{ route('user.course_management.module.delete_lesson', ['id' => $lesson->id]) }}"
                                            method="post">

                                            @csrf
                                            <button type="submit" class="btn btn-sm btn-danger lessonDeleteBtn">
                                                <span class="btn-label">
                                                    <i class="fas fa-trash"></i>
                                                </span>
                                                {{ __('Delete') }}
                                            </button>
                                        </form>
                                    </td>
                                </tr>
                            @endforeach
                        </tbody>
                    </table>
                @endif
            </div>
        </div>
    </div>
</div>
